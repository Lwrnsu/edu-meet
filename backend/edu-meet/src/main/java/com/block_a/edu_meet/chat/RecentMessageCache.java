package com.block_a.edu_meet.chat;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

@Component
public class RecentMessageCache {

    static final int MAX_MESSAGES = 50;
    private static final Duration TTL = Duration.ofDays(3);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public RecentMessageCache(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    private String key(String conversationId) {
        return "chat:recent:v2:" + conversationId;
    }

    public Optional<List<Message>> getLatest(String conversationId, List<String> expectedIds) {
        try {
            String json = redis.opsForValue().get(key(conversationId));
            if (json == null) return Optional.empty();
            List<Message> cached = Arrays.asList(objectMapper.readValue(json, Message[].class));
            if (cached.size() > MAX_MESSAGES || cached.size() != expectedIds.size()) {
                return Optional.empty();
            }
            // Count alone cannot detect missing, stale or out-of-order messages.
            for (int i = 0; i < cached.size(); i++) {
                Message message = cached.get(i);
                if (message == null || !expectedIds.get(i).equals(message.getId())
                        || !conversationId.equals(message.getConversationId())
                        || message.getTimestamp() == null || message.getText() == null) {
                    return Optional.empty();
                }
            }
            return Optional.of(cached);
        } catch (Exception e) {
            System.out.println("Cache read failed, using MongoDB: " + e.getMessage());
            return Optional.empty();
        }
    }

    public void putLatest(String conversationId, List<Message> messages) {
        try {
            List<Message> recent = messages.stream().limit(MAX_MESSAGES).toList();
            // One SET publishes the whole snapshot, so readers never see a half-built list.
            redis.opsForValue().set(key(conversationId), objectMapper.writeValueAsString(recent), TTL);
        } catch (Exception e) {
            System.out.println("Cache write failed, keeping MongoDB result: " + e.getMessage());
        }
    }

    public void invalidate(String conversationId) {
        try {
            redis.delete(key(conversationId));
        } catch (Exception e) {
            // The ID comparison still catches stale snapshots if this delete fails.
            System.out.println("Cache invalidation failed: " + e.getMessage());
        }
    }
}
