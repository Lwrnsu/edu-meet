package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;

@SpringBootTest
class MongoIndexTest {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Test
    void createsConversationAndTimestampIndexOnMessages() {
        Document expected = new Document("conversationId", 1).append("timestamp", -1);
        assertTrue(mongoTemplate.getCollection("messages").listIndexes().into(new ArrayList<>())
                .stream().anyMatch(index -> expected.equals(index.get("key", Document.class))),
                "MongoDB should have the conversationId and descending timestamp index");
    }

    @Test
    void createsParticipantIndexOnConversations() {
        Document expected = new Document("participantIds", 1);
        assertTrue(mongoTemplate.getCollection("conversations").listIndexes().into(new ArrayList<>())
                .stream().anyMatch(index -> expected.equals(index.get("key", Document.class))),
                "MongoDB should have the participantIds index");
    }
}
