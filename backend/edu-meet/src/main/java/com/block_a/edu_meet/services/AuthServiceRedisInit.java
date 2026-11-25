package com.block_a.edu_meet.services;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuthServiceRedisInit {

    public AuthServiceRedisInit(
            StringRedisTemplate redisTemplate,
            @Value("${app.auth.token-ttl-seconds:86400}") long tokenTtlSeconds) {
        AuthService.configure(redisTemplate, Duration.ofSeconds(tokenTtlSeconds));
    }
}
