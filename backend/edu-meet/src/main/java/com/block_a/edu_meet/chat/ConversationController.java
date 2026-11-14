package com.block_a.edu_meet.chat;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationRepository conversationRepository;
    private final MemberLookup memberLookup;

    public ConversationController(ConversationRepository conversationRepository,
                                  MemberLookup memberLookup) {
        this.conversationRepository = conversationRepository;
        this.memberLookup = memberLookup;
    }

    @GetMapping
    public List<Conversation> getMyConversations(@RequestParam String userId) {
        return conversationRepository.findByParticipantIdsContaining(userId);
    }

    @GetMapping("/{conversationId}/members")
    public List<MemberDto> getMembers(@PathVariable String conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return memberLookup.findMembers(conversation.getParticipantIds());
    }
}