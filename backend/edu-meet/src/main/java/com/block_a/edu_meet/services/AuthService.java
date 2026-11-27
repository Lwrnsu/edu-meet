package com.block_a.edu_meet.services;

import com.block_a.edu_meet.exception.ApiException;
import com.block_a.edu_meet.models.LogInModel;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

public final class AuthService {

    private static final String KEY_PREFIX = "auth:token:";
    // auth:user:<id> = set of that user's live tokens, so we can find them on update/delete
    private static final String USER_INDEX_PREFIX = "auth:user:";
    private static final int TOKEN_BYTES = 32;
    private static final int MAX_ATTEMPTS = 5;
    // 32 random bytes -> 43 chars of unpadded base64url
    private static final Pattern TOKEN_FORMAT = Pattern.compile("^[A-Za-z0-9_-]{43}$");
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
                indexToken(model.getId(), token);
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
        int userId = model.getId();
        if (userId > 0) {
            redisCall(() -> template().expire(USER_INDEX_PREFIX + userId, tokenTtl));
        }
        return model;
    }

    public static boolean logOut(String authorizationToken) {
        String token = normalize(authorizationToken);
        if (token == null) {
            return false;
        }

        String key = KEY_PREFIX + token;
        LogInModel model = parse(redisCall(() -> template().opsForValue().get(key)));
        boolean removed = Boolean.TRUE.equals(redisCall(() -> template().delete(key)));
        if (model != null && model.getId() > 0) {
            int userId = model.getId();
            redisCall(() -> template().opsForSet().remove(USER_INDEX_PREFIX + userId, token));
        }
        return removed;
    }

    /** User info was edited: merge the new fields into every live session of that user. */
    public static int updateUser(int userId, Map<String, Object> changes) {
        if (userId <= 0 || changes == null || changes.isEmpty()) {
            return 0;
        }

        String indexKey = USER_INDEX_PREFIX + userId;
        Set<String> tokens = redisCall(() -> template().opsForSet().members(indexKey));
        if (tokens == null) {
            return 0;
        }

        int updated = 0;
        for (String token : tokens) {
            String key = KEY_PREFIX + token;
            LogInModel model = parse(redisCall(() -> template().opsForValue().get(key)));
            if (model == null) {
                // token already expired or was logged out: clean the index
                redisCall(() -> template().opsForSet().remove(indexKey, token));
                continue;
            }

            Map<String, Object> merged = new LinkedHashMap<>();
            if (model.getUser() != null) {
                merged.putAll(model.getUser());
            }
            merged.putAll(changes); // role, role_label and school are kept unless changed
            model.setUser(merged);

            String json = MAPPER.writeValueAsString(model);
            redisCall(() -> {
                template().opsForValue().set(key, json, tokenTtl);
                return null;
            });
            updated++;
        }
        return updated;
    }

    /** User was deleted: remove every live session of that user from Redis. */
    public static int deleteUser(int userId) {
        if (userId <= 0) {
            return 0;
        }

        String indexKey = USER_INDEX_PREFIX + userId;
        Set<String> tokens = redisCall(() -> template().opsForSet().members(indexKey));
        List<String> keys = new ArrayList<>();
        if (tokens != null) {
            for (String token : tokens) {
                keys.add(KEY_PREFIX + token);
            }
        }
        keys.add(indexKey);

        Long removed = redisCall(() -> template().delete(keys));
        return removed == null ? 0 : removed.intValue();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> toMap(String json) {
        try {
            return json == null ? null : MAPPER.readValue(json, Map.class);
        } catch (JacksonException ex) {
            return null;
        }
    }

    private static LogInModel parse(String value) {
        if (value == null) {
            return null;
        }
        try {
            return MAPPER.readValue(value, LogInModel.class);
        } catch (JacksonException ex) {
            return null;
        }
    }

    private static void indexToken(int userId, String token) {
        if (userId <= 0) {
            return;
        }
        String indexKey = USER_INDEX_PREFIX + userId;
        redisCall(() -> template().opsForSet().add(indexKey, token));
        redisCall(() -> template().expire(indexKey, tokenTtl));
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

        return TOKEN_FORMAT.matcher(token).matches() ? token : null;
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
