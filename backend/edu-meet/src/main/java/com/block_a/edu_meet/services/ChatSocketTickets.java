package com.block_a.edu_meet.services;

import java.time.Duration;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.block_a.edu_meet.security.PhpChatAccount;

@Service
public class ChatSocketTickets {
    private static final Duration TTL = Duration.ofSeconds(30);
    private static final String PREFIX = "chat:socket-ticket:";
    private final StringRedisTemplate redis;

    public ChatSocketTickets(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public String issue(PhpChatAccount account) {
        String ticket = UUID.randomUUID().toString();
        redis.opsForValue().set(PREFIX + ticket, account.sessionToken(), TTL);
        return ticket;
    }

    public PhpChatAccount redeem(String ticket) {
        if (ticket == null || !ticket.matches("[0-9a-f-]{36}")) return null;
        String token = redis.opsForValue().getAndDelete(PREFIX + ticket);
        return token == null ? null : PhpChatAccount.fromSession(token);
    }
}
