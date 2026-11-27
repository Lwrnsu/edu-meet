package com.block_a.edu_meet.dao;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.repositories.ConversationRepository;

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

        return conversationRepository.findById(conversationId)
                .filter(conversation -> conversation.getParticipantIds().contains(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist"));
    }
}

