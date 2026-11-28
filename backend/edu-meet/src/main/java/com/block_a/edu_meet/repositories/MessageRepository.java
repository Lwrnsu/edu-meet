package com.block_a.edu_meet.repositories;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import com.block_a.edu_meet.models.Message;

public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findByConversationIdOrderByTimestampDescIdDesc(String conversationId, Pageable pageable);

    @Query(value = "{'conversationId': ?0}", fields = "{'_id': 1}",
            sort = "{'timestamp': -1, '_id': -1}")
    List<Message> findRecentIds(String conversationId, Pageable pageable);

    @Query(value = "{'conversationId': ?0, '$or': ["
            + "{'timestamp': {'$lt': ?1}}, {'timestamp': ?1, '_id': {'$lt': ?2}}]}",
            sort = "{'timestamp': -1, '_id': -1}")
    List<Message> findOlderMessages(String conversationId, Instant before, String beforeId, Pageable pageable);

    Message findFirstByConversationIdOrderByTimestampDescIdDesc(String conversationId);
}