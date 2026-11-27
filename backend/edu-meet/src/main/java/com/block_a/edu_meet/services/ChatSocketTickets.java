package com.block_a.edu_meet.services;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.block_a.edu_meet.security.JwtAccount;

@Service
public class ChatSocketTickets {
    private static final Duration TTL = Duration.ofSeconds(30);
    private static final String PREFIX = "chat:socket-ticket:";
    private final StringRedisTemplate redis;

    public ChatSocketTickets(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public String issue(JwtAccount account) {
        String ticket = UUID.randomUUID().toString();
        redis.opsForValue().set(PREFIX + ticket,
                account.id() + ":" + account.expiresAt().toEpochMilli(), TTL);
        return ticket;
    }

    public SocketIdentity redeem(String ticket) {
        if (ticket == null || !ticket.matches("[0-9a-f-]{36}")) return null;
        String value = redis.opsForValue().getAndDelete(PREFIX + ticket);
        if (value == null) return null;
        String[] parts = value.split(":", 2);
        Instant expiresAt = Instant.ofEpochMilli(Long.parseLong(parts[1]));
        return expiresAt.isAfter(Instant.now()) ? new SocketIdentity(parts[0], expiresAt) : null;
    }

    public record SocketIdentity(String userId, Instant expiresAt) {}
}
