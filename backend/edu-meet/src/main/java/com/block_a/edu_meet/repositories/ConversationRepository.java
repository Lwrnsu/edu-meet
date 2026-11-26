package com.block_a.edu_meet.repositories;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;

public interface ConversationRepository extends MongoRepository<Conversation, String> {

    List<Conversation> findByParticipantIdsContaining(String userId);

    List<Conversation> findByTypeAndParticipantIdsContaining(ConversationType type, String userId);

    Conversation findFirstByTypeAndBlockId(ConversationType type, String blockId);

    Conversation findFirstByTypeAndClassId(ConversationType type, String classId);
}
