package com.block_a.edu_meet.chat;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ConversationAccess {

    private final ConversationRepository conversationRepository;

    public ConversationAccess(ConversationRepository conversationRepository) {
        this.conversationRepository = conversationRepository;
    }

    public Conversation requireMember(String conversationId, String userId) {
        // userId is supplied by the client until JWT integration provides the verified identity.
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conversation.getParticipantIds().contains(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "you are not a member of this chat");
        }
        return conversation;
    }
}
