package com.block_a.edu_meet.chat;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

@Component
public class RecentMessageCache {

    private static final int MAX_MESSAGES = 50;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public RecentMessageCache(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    private String key(String conversationId) {
        return "chat:recent:" + conversationId;
    }

    public void add(Message message) {
        String k = key(message.getConversationId());
        redis.opsForList().leftPush(k, objectMapper.writeValueAsString(message));
        redis.opsForList().trim(k, 0, MAX_MESSAGES - 1);
    }

    public List<Message> getLatest(String conversationId, int count) {
        List<String> raw = redis.opsForList().range(key(conversationId), 0, count - 1);
        List<Message> result = new ArrayList<>();
        if (raw != null) {
            for (String json : raw) {
                result.add(objectMapper.readValue(json, Message.class));
            }
        }
        return result;
    }
}