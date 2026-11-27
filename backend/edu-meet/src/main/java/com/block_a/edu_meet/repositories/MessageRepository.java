package com.block_a.edu_meet.repositories;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import com.block_a.edu_meet.models.Message;

public interface MessageRepository extends MongoRepository<Message, String> {

    @Query(value = "{'conversationId': ?0, 'unsent': {'$ne': true}}", fields = "{'attachmentBytes': 0}",
            sort = "{'timestamp': -1, '_id': -1}")
    List<Message> findByConversationIdOrderByTimestampDescIdDesc(String conversationId, Pageable pageable);

    @Query(value = "{'conversationId': ?0, 'unsent': {'$ne': true}}", fields = "{'_id': 1}",
            sort = "{'timestamp': -1, '_id': -1}")
    List<Message> findRecentIds(String conversationId, Pageable pageable);

    @Query(value = "{'conversationId': ?0, 'unsent': {'$ne': true}, '$or': ["
            + "{'timestamp': {'$lt': ?1}}, {'timestamp': ?1, '_id': {'$lt': ?2}}]}",
            fields = "{'attachmentBytes': 0}", sort = "{'timestamp': -1, '_id': -1}")
    List<Message> findOlderMessages(String conversationId, Instant before, String beforeId, Pageable pageable);

    @Query(value = "{'conversationId': ?0, '_id': {'$in': ?1}, 'unsent': {'$ne': true}}",
            fields = "{'attachmentBytes': 0}")
    List<Message> findByConversationIdAndIdIn(String conversationId, List<String> ids);

    @Query(value = "{'_id': ?0}", fields = "{'attachmentBytes': 0}")
    Optional<Message> findMetadataById(String id);

    Optional<Message> findByIdAndConversationId(String id, String conversationId);

    default Message findFirstByConversationIdOrderByTimestampDescIdDesc(String conversationId) {
        return findByConversationIdOrderByTimestampDescIdDesc(conversationId, Pageable.ofSize(1))
                .stream().findFirst().orElse(null);
    }
}
