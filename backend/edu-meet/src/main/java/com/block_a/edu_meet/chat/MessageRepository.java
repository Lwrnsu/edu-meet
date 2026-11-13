package com.block_a.edu_meet.chat;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findByConversationIdOrderByTimestampDesc(String conversationId, Pageable pageable);

    List<Message> findByConversationIdAndTimestampBeforeOrderByTimestampDesc(
            String conversationId, Instant before, Pageable pageable);
}