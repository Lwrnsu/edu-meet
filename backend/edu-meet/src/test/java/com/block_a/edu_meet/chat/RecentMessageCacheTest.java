package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;

import tools.jackson.databind.ObjectMapper;

import com.block_a.edu_meet.controllers.MessageController;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.RecentMessageCache;

@SpringBootTest
class RecentMessageCacheTest {

    @Autowired private MessageRepository messages;
    @Autowired private ConversationRepository conversations;
    @Autowired private ConversationAccess access;
    @Autowired private RecentMessageCache cache;
    @Autowired private StringRedisTemplate redis;
    @Autowired private ObjectMapper mapper;

    private Conversation conversation;
    private final List<Message> created = new ArrayList<>();
    private MessageRepository observed;
    private MessageController controller;

    @BeforeEach
    void setUp() {
        conversation = conversations.save(new Conversation(
                ConversationType.BLOCK, "Cache test", List.of("member")));
        observed = mock(MessageRepository.class, delegatesTo(messages));
        controller = new MessageController(observed, access, cache);
    }

    @AfterEach
    void cleanUp() {
        if (conversation != null) {
            cache.invalidate(conversation.getId());
            messages.deleteAll(created);
            conversations.deleteById(conversation.getId());
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 8, 65})
    void warmsAtMost50MessagesThenServesBodiesFromRedis(int count) {
        seed(count);
        List<Message> expected = latest50();
        assertIds(expected.stream().limit(20).toList(), controller.getLatestMessages(id(), "member"));
        assertIds(expected, cache.getLatest(id(), ids(expected)).orElseThrow());
        assertTrue(redis.getExpire(key()) > 0);
        assertTrue(redis.getExpire(key()) <= 600);

        clearInvocations(observed);
        assertIds(expected.stream().limit(20).toList(), controller.getLatestMessages(id(), "member"));
        verify(observed).findRecentIds(eq(id()), any());
        verify(observed, never()).findByConversationIdOrderByTimestampDescIdDesc(anyString(), any());
        if (!expected.isEmpty()) {
            assertEquals(expected.getFirst().getText(), controller.getLatestMessages(id(), "member").getFirst().getText());
            Message projected = messages.findRecentIds(id(), PageRequest.of(0, 1)).getFirst();
            assertNull(projected.getText(), "The freshness check should fetch IDs, not bodies");
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing-middle", "out-of-order", "wrong-chat"})
    void rejectsAnIncorrectCacheEvenWhenItContains50Messages(String problem) {
        seed(65);
        List<Message> expected = latest50();
        List<Message> broken = new ArrayList<>(expected);
        if (problem.equals("missing-middle")) {
            broken.remove(10);
            broken.add(created.getFirst());
        } else if (problem.equals("out-of-order")) {
            Collections.swap(broken, 0, 1);
        } else {
            Message wrong = new Message("other-chat", "member", "Wrong chat", expected.getFirst().getTimestamp());
            wrong.setId(expected.getFirst().getId());
            broken.set(0, wrong);
        }
        cache.putLatest(id(), broken);
        assertIds(expected.stream().limit(20).toList(), controller.getLatestMessages(id(), "member"));
        verify(observed).findByConversationIdOrderByTimestampDescIdDesc(eq(id()), any());
        assertIds(expected, cache.getLatest(id(), ids(expected)).orElseThrow());
    }

    @Test
    void staleCacheIsRejectedEvenIfInvalidationWasMissed() {
        seed(65);
        controller.getLatestMessages(id(), "member");
        Message arrived = messages.save(new Message(id(), "member", "New arrival",
                Instant.parse("2026-11-16T00:00:00Z")));
        created.add(arrived);
        clearInvocations(observed);
        assertEquals(arrived.getId(), controller.getLatestMessages(id(), "member").getFirst().getId());
        verify(observed).findByConversationIdOrderByTimestampDescIdDesc(eq(id()), any());
    }

    @Test
    void oldRefillCannotHideMessagesFromANewerSnapshot() {
        seed(65);
        List<Message> old = latest50();
        Message arrived = messages.save(new Message(id(), "member", "New arrival",
                Instant.parse("2026-11-16T00:00:00Z")));
        created.add(arrived);
        controller.getLatestMessages(id(), "member");
        cache.putLatest(id(), old); // Simulate an earlier request finishing its refill late.
        assertEquals(arrived.getId(), controller.getLatestMessages(id(), "member").getFirst().getId());
    }

    @ParameterizedTest
    @ValueSource(strings = {"not json", "null", "[null]"})
    void corruptCacheFallsBackToMongo(String value) {
        seed(5);
        redis.opsForValue().set(key(), value);
        assertIds(latest50(), controller.getLatestMessages(id(), "member"));
    }

    @Test
    void redisFailuresDoNotBreakHistoryOrInvalidation() {
        seed(5);
        StringRedisTemplate offline = mock(StringRedisTemplate.class);
        when(offline.opsForValue()).thenThrow(new RedisConnectionFailureException("Test offline"));
        doThrow(new RedisConnectionFailureException("Test offline")).when(offline).delete(anyString());
        RecentMessageCache unavailable = new RecentMessageCache(offline, mapper);
        MessageController fallback = new MessageController(observed, access, unavailable);
        assertIds(latest50(), fallback.getLatestMessages(id(), "member"));
        unavailable.invalidate(id());
    }

    @Test
    void invalidationRemovesTheSnapshot() {
        seed(5);
        controller.getLatestMessages(id(), "member");
        cache.invalidate(id());
        assertTrue(cache.getLatest(id(), ids(latest50())).isEmpty());
    }

    private void seed(int count) {
        List<Message> batch = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            batch.add(new Message(id(), "member", "Message " + i,
                    Instant.parse("2026-11-15T00:00:00Z").plusSeconds(i)));
        }
        created.addAll(messages.saveAll(batch));
    }

    private String id() { return conversation.getId(); }
    private String key() { return "chat:recent:v2:" + id(); }
    private List<Message> latest50() {
        return messages.findByConversationIdOrderByTimestampDescIdDesc(id(), PageRequest.of(0, 50));
    }
    private List<String> ids(List<Message> values) {
        return values.stream().map(Message::getId).toList();
    }
    private void assertIds(List<Message> expected, List<Message> actual) {
        assertEquals(ids(expected), ids(actual));
    }
}
