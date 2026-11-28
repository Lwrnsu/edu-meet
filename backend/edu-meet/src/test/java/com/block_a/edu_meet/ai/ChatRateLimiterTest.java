package com.block_a.edu_meet.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatRateLimiterTest {

    @Test
    void allowsUpToTheLimitThenBlocks() {
        ChatRateLimiter limiter = new ChatRateLimiter(2, 60);

        assertTrue(limiter.allow("client-a"));
        assertTrue(limiter.allow("client-a"));
        assertFalse(limiter.allow("client-a"));
    }

    @Test
    void separateClientsDoNotShareTheWindow() {
        ChatRateLimiter limiter = new ChatRateLimiter(1, 60);

        assertTrue(limiter.allow("client-a"));
        assertFalse(limiter.allow("client-a"));
        assertTrue(limiter.allow("client-b"));
    }
}
