package com.block_a.edu_meet.services;

import com.block_a.edu_meet.exception.ApiException;
import com.block_a.edu_meet.models.LogInModel;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

public final class AuthService {

    private static final String KEY_PREFIX = "auth:token:";
    private static final int TOKEN_BYTES = 32;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static volatile StringRedisTemplate redis;
    private static volatile Duration tokenTtl = Duration.ofHours(24);

    private AuthService() {
    }

    static void configure(StringRedisTemplate template, Duration ttl) {
        redis = template;
        tokenTtl = ttl;
    }

    public static String createAuthToken(LogInModel model) {
        if (model == null) {
            throw new IllegalArgumentException("model is required");
        }

        String value = MAPPER.writeValueAsString(model);

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String token = generateToken();
            Boolean stored = redisCall(
                    () -> template().opsForValue().setIfAbsent(KEY_PREFIX + token, value, tokenTtl));
            if (Boolean.TRUE.equals(stored)) {
                return token;
            }
        }

        throw new ApiException("Could not create an auth token", HttpStatus.SERVICE_UNAVAILABLE);
    }

    public static LogInModel logIn(String authorizationToken) {
        String token = normalize(authorizationToken);
        if (token == null) {
            return null;
        }

        String key = KEY_PREFIX + token;
        String value = redisCall(() -> template().opsForValue().get(key));
        if (value == null) {
            return null;
        }

        LogInModel model;
        try {
            model = MAPPER.readValue(value, LogInModel.class);
        } catch (JacksonException ex) {
            return null;
        }

        redisCall(() -> template().expire(key, tokenTtl));
        return model;
    }

    public static boolean logOut(String authorizationToken) {
        String token = normalize(authorizationToken);
        if (token == null) {
            return false;
        }

        return Boolean.TRUE.equals(redisCall(() -> template().delete(KEY_PREFIX + token)));
    }

    private static String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String normalize(String authorizationToken) {
        if (authorizationToken == null) {
            return null;
        }

        String token = authorizationToken.trim();
        if (token.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = token.substring(7).trim();
        }

        return token.isEmpty() ? null : token;
    }

    private static StringRedisTemplate template() {
        StringRedisTemplate template = redis;
        if (template == null) {
            throw new IllegalStateException("Redis is not configured");
        }

        return template;
    }

    private static <T> T redisCall(Supplier<T> action) {
        try {
            return action.get();
        } catch (DataAccessException ex) {
            throw new ApiException("Session service unavailable", HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
