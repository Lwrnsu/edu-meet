package com.block_a.edu_meet.chat;

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
        Conversation conversation = new Conversation(
                request.type(), request.name(), request.participantIds());
        conversation.setBlockId(request.blockId());
        conversation.setClassId(request.classId());
        return conversationRepository.save(conversation);
    }
}