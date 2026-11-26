package com.block_a.edu_meet.services;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuthServiceRedisInit {

    private static final long DEFAULT_TTL_SECONDS = 86400; // 24 hours

    public AuthServiceRedisInit(
            StringRedisTemplate redisTemplate,
            @Value("${app.auth.token-ttl-seconds:86400}") long tokenTtlSeconds) {
        // A zero/negative TTL makes Redis reject every SET, so fall back to 24 hours
        long ttl = tokenTtlSeconds > 0 ? tokenTtlSeconds : DEFAULT_TTL_SECONDS;
        AuthService.configure(redisTemplate, Duration.ofSeconds(ttl));
    }
}
