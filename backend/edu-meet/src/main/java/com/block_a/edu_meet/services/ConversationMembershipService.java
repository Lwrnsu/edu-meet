package com.block_a.edu_meet.services;

import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;

@Service
public class ConversationMembershipService {

    private final MongoOperations mongoOperations;

    public ConversationMembershipService(MongoOperations mongoOperations) {
        this.mongoOperations = mongoOperations;
    }

    /**
     * Removes the authenticated caller from a group chat.
     * The calling backend supplies the verified user ID and applies any class-specific leave policy.
     */
    public void leaveGroupConversation(String conversationId, String verifiedUserId) {
        if (conversationId == null || conversationId.isBlank()
                || verifiedUserId == null || verifiedUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "conversationId and userId are required");
        }

        Query membership = Query.query(Criteria.where("id").is(conversationId)
                .and("type").in(ConversationType.BLOCK, ConversationType.SUBJECT)
                .and("participantIds").is(verifiedUserId));
        var result = mongoOperations.updateFirst(
                membership, new Update().pull("participantIds", verifiedUserId), Conversation.class);
        if (result.getMatchedCount() == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist");
        }
    }
}
