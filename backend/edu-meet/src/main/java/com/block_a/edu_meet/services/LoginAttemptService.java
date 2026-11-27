package com.block_a.edu_meet.services;

import com.block_a.edu_meet.exception.ApiException;
import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

	private static final int MAX_FAILURES = 5;
	private static final Duration WINDOW = Duration.ofMinutes(15);
	private static final String KEY_PREFIX = "login:fail:";
	private static final String LOCK_MESSAGE =
			"Too many failed login attempts. Try again in 15 minutes.";

	private final StringRedisTemplate redis;

	public LoginAttemptService(StringRedisTemplate redis) {
		this.redis = redis;
	}

	public void assertNotLocked(String email) {
		String key = key(email);
		String raw = redis.opsForValue().get(key);
		if (raw == null || raw.isBlank()) {
			return;
		}

		long count;
		try {
			count = Long.parseLong(raw.trim());
		} catch (NumberFormatException ex) {
			redis.delete(key);
			return;
		}

		if (count >= MAX_FAILURES) {
			throw new ApiException(LOCK_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
		}
	}

	public void recordFailure(String email) {
		String key = key(email);
		Long count = redis.opsForValue().increment(key);
		if (count != null && count == 1L) {
			redis.expire(key, WINDOW);
		}
	}

	public void clear(String email) {
		redis.delete(key(email));
	}

	private static String key(String email) {
		return KEY_PREFIX + normalize(email);
	}

	private static String normalize(String email) {
		return email == null ? "" : email.trim().toLowerCase();
	}
}
