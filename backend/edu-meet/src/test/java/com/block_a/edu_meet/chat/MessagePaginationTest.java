package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.block_a.edu_meet.controllers.MessageController;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.RecentMessageCache;

@SpringBootTest
class MessagePaginationTest {

    @Autowired
    private MessageController controller;
    @Autowired
    private MessageRepository messages;
    @Autowired
    private ConversationRepository conversations;
    @Autowired
    private RecentMessageCache cache;

    private Conversation conversation;
    private final List<Message> created = new ArrayList<>();

    @BeforeEach
    void setUp() {
        conversation = conversations.save(new Conversation(
                ConversationType.BLOCK, "Pagination test", List.of("member")));
    }

    @AfterEach
    void cleanUp() {
        messages.deleteAll(created);
        if (conversation != null) {
            cache.invalidate(conversation.getId());
            conversations.deleteById(conversation.getId());
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void pagesThroughEveryMessageOnceWhenTimestampsRepeat(boolean allAtSameTime) {
        Instant base = Instant.parse("2026-11-15T12:00:00Z");
        List<Message> expected = new ArrayList<>();
        for (int i = 0; i < 45; i++) {
            expected.add(save(conversation.getId(), "message " + i,
                    base.plusSeconds(allAtSameTime ? 0 : i % 3)));
        }
        // A different chat must never leak into the pages, even with the same timestamp.
        save(UUID.randomUUID().toString(), "Other chat", base);
        expected.sort(Comparator.comparing(Message::getTimestamp)
                .thenComparing(Message::getId).reversed());

        List<Message> page = controller.getLatestMessages(conversation.getId(), "member");
        assertEquals(20, page.size());
        assertEquals(page.stream().map(Message::getId).toList(),
                controller.getLatestMessages(conversation.getId(), "member")
                        .stream().map(Message::getId).toList(),
                "The warmed cache must keep the same order when timestamps repeat");
        List<Message> received = new ArrayList<>(page);

        // New activity after page one must not shift the older-page cursor.
        save(conversation.getId(), "Arrived after opening", base.plusSeconds(10));
        for (int i = 0; i < 4 && !page.isEmpty(); i++) {
            page = controller.getOlderMessages(conversation.getId(), "member", page.getLast().getId());
            assertTrue(page.size() <= 20);
            received.addAll(page);
        }

        assertTrue(page.isEmpty(), "Pagination should reach the end");
        assertEquals(expected.stream().map(Message::getId).toList(),
                received.stream().map(Message::getId).toList());
    }

    private Message save(String conversationId, String text, Instant timestamp) {
        Message saved = messages.save(new Message(conversationId, "member", text, timestamp));
        created.add(saved);
        return saved;
    }
}
