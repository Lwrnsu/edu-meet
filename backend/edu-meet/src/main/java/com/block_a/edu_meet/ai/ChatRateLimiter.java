package com.block_a.edu_meet.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// A small in-memory fixed-window limiter for the chat endpoint. It is a
// stop-gap until the endpoint is authenticated and can be limited per user;
// keyed by client address for now.
@Component
public class ChatRateLimiter {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private final int limit;
    private final long windowMillis;
    private final Map<String, long[]> windows = new ConcurrentHashMap<>();

    public ChatRateLimiter(@Value("${edu-meet.chat.rate-limit:30}") int limit,
                           @Value("${edu-meet.chat.rate-window-seconds:60}") long windowSeconds) {
        this.limit = Math.max(1, limit);
        this.windowMillis = Math.max(1, windowSeconds) * 1000L;
    }

    public boolean allow(String key) {
        long now = System.currentTimeMillis();

        long[] window = windows.compute(key, (ignored, current) -> {
            if (current == null || now - current[0] >= windowMillis) {
                return new long[]{now, 1};
            }
            current[1]++;
            return current;
        });

        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.entrySet().removeIf(entry -> now - entry.getValue()[0] >= windowMillis);
        }

        return window[1] <= limit;
    }
}
