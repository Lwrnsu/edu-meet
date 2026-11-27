package com.block_a.edu_meet.controllers;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Profile;
import org.springframework.dao.DuplicateKeyException;
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

/* 
    Must return API response, not the data instantly. 
    {
        response: true / false
        code: ex. 404
        message: ex. "Conversation Doesn't Exist"
        body: the data itself. 
    }
    explaination: so that in front-end, it must verify if the
                api succedded or not before using the provided data.


*/

@Profile("chat")
@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationRepository conversationRepository;
    private final MemberLookup memberLookup;
    private final MessageRepository messageRepository;
    private final ConversationAccess conversationAccess;
    // unnecessary.
    public ConversationController(ConversationRepository conversationRepository,
                                  MemberLookup memberLookup,
                                  MessageRepository messageRepository,
                                  ConversationAccess conversationAccess) {
        this.conversationRepository = conversationRepository;
        this.memberLookup = memberLookup;
        this.messageRepository = messageRepository;
        this.conversationAccess = conversationAccess;
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
                            last == null ? null : last.getText(),
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
        if (request.type() == null
                || request.participantIds() == null
                || request.participantIds().isEmpty()
                || request.participantIds().stream().anyMatch(id -> id == null || id.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type and participantIds are required");
        }
        if (request.type() == ConversationType.PRIVATE
                && (request.participantIds().size() != 2 || new HashSet<>(request.participantIds()).size() != 2)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats need 2 distinct participants");
        }
        if (request.type() != ConversationType.PRIVATE
                && (request.name() == null || request.name().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "group chats need a name");
        }


        // return the existing chat instead of creating a duplicate
        if (request.type() == ConversationType.PRIVATE) {
            String first = request.participantIds().get(0);
            String second = request.participantIds().get(1);
            for (Conversation existing : conversationRepository
                    .findByTypeAndParticipantIdsContaining(ConversationType.PRIVATE, first)) {
                if (existing.getParticipantIds().contains(second)) {
                    return existing;
                }
            }
        } else if (request.type() == ConversationType.BLOCK && request.blockId() != null) {
            Conversation existing = conversationRepository
                    .findFirstByTypeAndBlockId(ConversationType.BLOCK, request.blockId());
            if (existing != null) {
                return existing;
            }
        } else if (request.type() == ConversationType.SUBJECT && request.classId() != null) {
            Conversation existing = conversationRepository
                    .findFirstByTypeAndClassId(ConversationType.SUBJECT, request.classId());
            if (existing != null) {
                return existing;
            }
        }

        Conversation conversation = new Conversation(
                request.type(), request.name(), request.participantIds());
        conversation.setBlockId(request.blockId());
        conversation.setClassId(request.classId());
        conversation.setId(creationId(request));
        try {
            return conversationRepository.insert(conversation);
        } catch (DuplicateKeyException e) {
            // Another request created this chat after our lookup. Keep its data intact.
            return conversationRepository.findById(conversation.getId()).orElseThrow(() -> e);
        }
    }

    private String creationId(CreateConversationRequest request) {
        String key = switch (request.type()) {
            case PRIVATE -> "PRIVATE:" + request.participantIds().stream().sorted()
                    .map(id -> id.length() + ":" + id).collect(Collectors.joining());
            case BLOCK -> request.blockId() == null ? null : "BLOCK:" + request.blockId();
            case SUBJECT -> request.classId() == null ? null : "SUBJECT:" + request.classId();
        };
        if (key == null) return null;

        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            return "chat_" + HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    @PostMapping("/{conversationId}/members")
    public Conversation addMembers(@PathVariable String conversationId,
                                   @RequestBody MemberChangeRequest request) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

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
        return conversationRepository.save(conversation);
    }


    @DeleteMapping("/{conversationId}/members/{userId}")
    public Conversation removeMember(@PathVariable String conversationId,
                                     @PathVariable String userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (conversation.getType() == ConversationType.PRIVATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats can't change members");
        }

        List<String> members = new ArrayList<>(conversation.getParticipantIds());
        members.remove(userId);
        conversation.setParticipantIds(members);
        return conversationRepository.save(conversation);
    }


        @PutMapping("/{conversationId}/members")
    public Conversation replaceMembers(@PathVariable String conversationId,
                                       @RequestBody MemberChangeRequest request) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (conversation.getType() == ConversationType.PRIVATE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats can't change members");
        }
        if (request.userIds() == null || request.userIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userIds is required");
        }

        conversation.setParticipantIds(new ArrayList<>(new java.util.LinkedHashSet<>(request.userIds())));
        return conversationRepository.save(conversation);
    }


}
