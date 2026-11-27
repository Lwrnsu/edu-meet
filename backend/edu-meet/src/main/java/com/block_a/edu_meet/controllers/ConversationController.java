package com.block_a.edu_meet.controllers;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;

import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.helpers.MemberLookup;
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
                                  MemberLookup memberLookup,
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
    public List<ConversationSummary> getMyConversations(@RequestParam String userId) {
        return conversationRepository.findByParticipantIdsContaining(userId).stream()
                .map(c -> {
                    Message last = messageRepository
                            .findFirstByConversationIdOrderByTimestampDescIdDesc(c.getId());
                    return new ConversationSummary(
                            c.getId(), c.getType(), c.getName(), c.getAvatarUrl(),
                            c.getParticipantIds(),
                            last == null ? null : preview(last),
                            last == null ? null : last.getTimestamp());
                })
                .sorted(Comparator.comparing(ConversationSummary::lastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @GetMapping("/{conversationId}/members")
    public List<MemberDto> getMembers(@PathVariable String conversationId,
                                      @RequestParam String userId) {
        Conversation conversation = conversationAccess.requireMember(conversationId, userId);
        return memberLookup.findMembers(conversation.getParticipantIds());
    }

    @PostMapping
    public Conversation createConversation(@RequestBody CreateConversationRequest request) {
        return conversationCreationService.createConversation(request);
    }

    @PostMapping("/{conversationId}/members")
    public Conversation addMembers(@PathVariable String conversationId,
                                   @RequestBody MemberChangeRequest request) {
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
                                     @PathVariable String userId) {
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
                                       @RequestBody MemberChangeRequest request) {
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
