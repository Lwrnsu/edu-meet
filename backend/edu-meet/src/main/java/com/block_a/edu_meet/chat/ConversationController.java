package com.block_a.edu_meet.chat;

import java.util.ArrayList;
import java.util.List;

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


@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationRepository conversationRepository;
    private final MemberLookup memberLookup;
    private final MessageRepository messageRepository;

    public ConversationController(ConversationRepository conversationRepository,
                                  MemberLookup memberLookup,
                                  MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.memberLookup = memberLookup;
        this.messageRepository = messageRepository;
    }

    @GetMapping
    public List<ConversationSummary> getMyConversations(@RequestParam String userId) {
        return conversationRepository.findByParticipantIdsContaining(userId).stream()
                .map(c -> {
                    Message last = messageRepository
                            .findFirstByConversationIdOrderByTimestampDesc(c.getId());
                    return new ConversationSummary(
                            c.getId(), c.getType(), c.getName(), c.getAvatarUrl(),
                            c.getParticipantIds(),
                            last == null ? null : last.getText(),
                            last == null ? null : last.getTimestamp());
                })
                .toList();
    }

    @GetMapping("/{conversationId}/members")
    public List<MemberDto> getMembers(@PathVariable String conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return memberLookup.findMembers(conversation.getParticipantIds());
    }

        @PostMapping
    public Conversation createConversation(@RequestBody CreateConversationRequest request) {
        if (request.type() == null
                || request.participantIds() == null
                || request.participantIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type and participantIds are required");
        }
        if (request.type() == ConversationType.PRIVATE && request.participantIds().size() != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats need exactly 2 participants");
        }
        if (request.type() != ConversationType.PRIVATE
                && (request.name() == null || request.name().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "group chats need a name");
        }

        Conversation conversation = new Conversation(
                request.type(), request.name(), request.participantIds());
        conversation.setBlockId(request.blockId());
        conversation.setClassId(request.classId());
        return conversationRepository.save(conversation);
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