package com.block_a.edu_meet.controllers;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;

import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.helpers.ChatIdentity;
import com.block_a.edu_meet.helpers.ConversationSummary;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.dtos.MemberDto;
import com.block_a.edu_meet.helpers.CreateConversationRequest;
import com.block_a.edu_meet.helpers.MemberChangeRequest;
import com.block_a.edu_meet.services.ConversationCreationService;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationRepository conversationRepository;
    private final MemberLookup memberLookup;
    private final MessageRepository messageRepository;
    private final ConversationAccess conversationAccess;
    private final ConversationCreationService conversationCreationService;
    private final MongoOperations mongoOperations;
    public ConversationController(ConversationRepository conversationRepository,
                                  @Qualifier("accountMemberLookup") MemberLookup memberLookup,
                                  MessageRepository messageRepository,
                                  ConversationAccess conversationAccess,
                                  ConversationCreationService conversationCreationService,
                                  MongoOperations mongoOperations) {
        this.conversationRepository = conversationRepository;
        this.memberLookup = memberLookup;
        this.messageRepository = messageRepository;
        this.conversationAccess = conversationAccess;
        this.conversationCreationService = conversationCreationService;
        this.mongoOperations = mongoOperations;
    }

    @GetMapping
    public List<ConversationSummary> getMyConversations(Principal principal) {
        return getMyConversations(ChatIdentity.userId(principal));
    }

    public List<ConversationSummary> getMyConversations(String userId) {
        List<Conversation> conversations = conversationRepository.findByParticipantIdsContaining(userId);
        var latestByConversation = new HashMap<String, Message>();
        var directPeers = new HashMap<String, String>();
        var memberIds = new LinkedHashSet<String>();
        for (Conversation conversation : conversations) {
            Message latest = messageRepository.findFirstByConversationIdOrderByTimestampDescIdDesc(conversation.getId());
            if (latest != null) {
                latestByConversation.put(conversation.getId(), latest);
                if (latest.getSenderId() != null) memberIds.add(latest.getSenderId());
            }
            if (conversation.getType() == ConversationType.PRIVATE) {
                conversation.getParticipantIds().stream().filter(id -> !id.equals(userId)).findFirst()
                        .ifPresent(peer -> {
                            directPeers.put(conversation.getId(), peer);
                            memberIds.add(peer);
                        });
            }
        }
        var memberNames = new HashMap<String, String>();
        if (!memberIds.isEmpty()) {
            memberLookup.findMembers(List.copyOf(memberIds))
                    .forEach(member -> memberNames.put(member.id(), member.fullName()));
        }

        return conversations.stream()
                .map(c -> {
                    Message last = latestByConversation.get(c.getId());
                    String name = memberNames.getOrDefault(directPeers.get(c.getId()), c.getName());
                    return new ConversationSummary(
                            c.getId(), c.getType(), name, c.getAvatarUrl(),
                            c.getParticipantIds(),
                            c.isArchivedBy(userId),
                            last == null ? null : preview(last),
                            last == null ? null : last.getTimestamp(),
                            last == null ? null : last.getId(),
                            last == null ? null : last.getSenderId(),
                            last == null ? null : memberNames.get(last.getSenderId()),
                            last == null || last.getAttachment() == null ? null : last.getAttachment().contentType());
                })
                .sorted(Comparator.comparing(ConversationSummary::lastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @PutMapping("/{conversationId}/archive")
    public ArchiveState archive(@PathVariable String conversationId, Principal principal) {
        return updateArchive(conversationId, ChatIdentity.userId(principal), true);
    }

    @DeleteMapping("/{conversationId}/archive")
    public ArchiveState restore(@PathVariable String conversationId, Principal principal) {
        return updateArchive(conversationId, ChatIdentity.userId(principal), false);
    }

    private ArchiveState updateArchive(String conversationId, String actor, boolean archived) {
        Query membership = Query.query(Criteria.where("id").is(conversationId).and("participantIds").is(actor));
        Update update = archived ? new Update().addToSet("archivedBy", actor) : new Update().pull("archivedBy", actor);
        if (mongoOperations.updateFirst(membership, update, Conversation.class).getMatchedCount() == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist");
        }
        return new ArchiveState(conversationId, archived);
    }

    public record ArchiveState(String conversationId, boolean archived) {}

    @GetMapping("/{conversationId}/members")
    public List<MemberDto> getMembers(@PathVariable String conversationId,
                                      Principal principal) {
        Conversation conversation = conversationAccess.requireMember(conversationId, ChatIdentity.userId(principal));
        return memberLookup.findMembers(conversation.getParticipantIds());
    }

    @PostMapping
    public Conversation createConversation(@RequestBody CreateConversationRequest request, Principal principal) {
        String actor = ChatIdentity.userId(principal);
        if (request.type() == ConversationType.PRIVATE) {
            if (request.participantIds() == null || !request.participantIds().contains(actor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A private chat must include your account");
            }
            var participants = new java.util.LinkedHashSet<>(request.participantIds());
            if (memberLookup.findMembers(new ArrayList<>(participants)).size() != participants.size()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown participant");
            }
        } else {
            requireRosterManager(principal);
        }
        return createConversation(request);
    }

    public Conversation createConversation(CreateConversationRequest request) {
        return conversationCreationService.createConversation(request);
    }

    @PostMapping("/{conversationId}/members")
    public Conversation addMembers(@PathVariable String conversationId,
                                   @RequestBody MemberChangeRequest request, Principal principal) {
        requireRosterManager(principal);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist"));

        if (conversation.getType() == ConversationType.PRIVATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats can't change members");
        }
        if (request.userIds() == null || request.userIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userIds is required");
        }

        List<String> members = new ArrayList<>(conversation.getParticipantIds());
        for (String id : request.userIds()) {
            if (!members.contains(id)) {
                members.add(id);
            }
        }
        conversation.setParticipantIds(members);
        return updateParticipants(conversation);
    }


    @DeleteMapping("/{conversationId}/members/{userId}")
    public Conversation removeMember(@PathVariable String conversationId,
                                     @PathVariable String userId, Principal principal) {
        requireRosterManager(principal);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist"));

        if (conversation.getType() == ConversationType.PRIVATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats can't change members");
        }

        List<String> members = new ArrayList<>(conversation.getParticipantIds());
        members.remove(userId);
        conversation.setParticipantIds(members);
        return updateParticipants(conversation);
    }


        @PutMapping("/{conversationId}/members")
    public Conversation replaceMembers(@PathVariable String conversationId,
                                       @RequestBody MemberChangeRequest request, Principal principal) {
        requireRosterManager(principal);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist"));

        if (conversation.getType() == ConversationType.PRIVATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats can't change members");
        }
        if (request.userIds() == null || request.userIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userIds is required");
        }

        conversation.setParticipantIds(new ArrayList<>(new java.util.LinkedHashSet<>(request.userIds())));
        return updateParticipants(conversation);
    }


    private void requireRosterManager(Principal principal) {
        ChatIdentity.require(principal);
        Authentication authentication = (Authentication) principal;
        if (authentication.getAuthorities().stream().noneMatch(
                authority -> "CHAT_ROSTER_ADMIN".equals(authority.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Roster management permission required");
        }
    }

    private String preview(Message message) {
        return (message.getText() == null || message.getText().isEmpty()) && message.getAttachment() != null
                ? message.getAttachment().name()
                : message.getText();
    }

    private Conversation updateParticipants(Conversation conversation) {
        Conversation updated = mongoOperations.findAndModify(
                Query.query(Criteria.where("id").is(conversation.getId())),
                new Update().set("participantIds", conversation.getParticipantIds()),
                FindAndModifyOptions.options().returnNew(true), Conversation.class);
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist");
        }
        return updated;
    }
}
