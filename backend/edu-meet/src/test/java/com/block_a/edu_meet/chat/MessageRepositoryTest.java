package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.List;
import org.springframework.data.domain.PageRequest;

@SpringBootTest
class MessageRepositoryTest {

    @Autowired
    private MessageRepository messageRepository;

    @Test
    void savesAndLoadsAMessage() {
        Message message = new Message("test-conversation", "user1", "Hello from the test", Instant.now());

        Message saved = messageRepository.save(message);

        assertNotNull(saved.getId());

        Message loaded = messageRepository.findById(saved.getId()).orElseThrow();
        assertEquals("Hello from the test", loaded.getText());

        messageRepository.deleteById(saved.getId());
    }

    @Test
    void loadsLatestAndOlderMessages() {
        String convo = "test-convo-paging";
        Instant base = Instant.now();

        for (int i = 1; i <= 5; i++) {
            messageRepository.save(new Message(convo, "user1", "msg " + i, base.plusSeconds(i)));
        }

        List<Message> latest = messageRepository
                .findByConversationIdOrderByTimestampDesc(convo, PageRequest.of(0, 3));
        assertEquals(3, latest.size());
        assertEquals("msg 5", latest.get(0).getText());

        Instant oldestOnScreen = latest.get(2).getTimestamp();
        List<Message> older = messageRepository
                .findByConversationIdAndTimestampBeforeOrderByTimestampDesc(
                        convo, oldestOnScreen, PageRequest.of(0, 3));
        assertEquals(2, older.size());
        assertEquals("msg 2", older.get(0).getText());

        messageRepository.deleteAll(latest);
        messageRepository.deleteAll(older);
    }

}