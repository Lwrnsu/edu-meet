package com.block_a.edu_meet.services;

import com.block_a.edu_meet.exception.ApiException;
import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class OtpRateLimitService {

	private static final int MAX_SENDS_PER_HOUR = 5;
	private static final int MAX_VERIFY_FAILURES = 5;
	private static final Duration SEND_COOLDOWN = Duration.ofSeconds(60);
	private static final Duration SEND_HOUR_WINDOW = Duration.ofHours(1);
	private static final Duration VERIFY_FAIL_WINDOW = Duration.ofMinutes(10);

	private static final String SEND_COOLDOWN_PREFIX = "otp:send:cd:";
	private static final String SEND_HOUR_PREFIX = "otp:send:hour:";
	private static final String VERIFY_FAIL_PREFIX = "otp:verify:fail:";

	private final StringRedisTemplate redis;

	public OtpRateLimitService(StringRedisTemplate redis) {
		this.redis = redis;
	}

	public void assertCanSend(String email) {
		String normalized = normalize(email);
		if (normalized.isEmpty()) {
			return;
		}

		Boolean coolingDown = redis.hasKey(SEND_COOLDOWN_PREFIX + normalized);
		if (Boolean.TRUE.equals(coolingDown)) {
			throw new ApiException(
					"Please wait 60 seconds before requesting another OTP.",
					HttpStatus.TOO_MANY_REQUESTS);
		}

		long hourCount = readCount(SEND_HOUR_PREFIX + normalized);
		if (hourCount >= MAX_SENDS_PER_HOUR) {
			throw new ApiException(
					"Too many OTP requests. Try again in an hour.",
					HttpStatus.TOO_MANY_REQUESTS);
		}
	}

	public void recordSend(String email) {
		String normalized = normalize(email);
		if (normalized.isEmpty()) {
			return;
		}

		redis.opsForValue().set(SEND_COOLDOWN_PREFIX + normalized, "1", SEND_COOLDOWN);

		String hourKey = SEND_HOUR_PREFIX + normalized;
		Long count = redis.opsForValue().increment(hourKey);
		if (count != null && count == 1L) {
			redis.expire(hourKey, SEND_HOUR_WINDOW);
		}
	}

	public void assertCanVerify(String email) {
		String normalized = normalize(email);
		if (normalized.isEmpty()) {
			return;
		}

		long failCount = readCount(VERIFY_FAIL_PREFIX + normalized);
		if (failCount >= MAX_VERIFY_FAILURES) {
			throw new ApiException(
					"Too many invalid OTP attempts. Try again in 10 minutes.",
					HttpStatus.TOO_MANY_REQUESTS);
		}
	}

	public void recordVerifyFailure(String email) {
		String normalized = normalize(email);
		if (normalized.isEmpty()) {
			return;
		}

		String key = VERIFY_FAIL_PREFIX + normalized;
		Long count = redis.opsForValue().increment(key);
		if (count != null && count == 1L) {
			redis.expire(key, VERIFY_FAIL_WINDOW);
		}
	}

	public void clearVerifyFailures(String email) {
		String normalized = normalize(email);
		if (normalized.isEmpty()) {
			return;
		}
		redis.delete(VERIFY_FAIL_PREFIX + normalized);
	}

	private long readCount(String key) {
		String raw = redis.opsForValue().get(key);
		if (raw == null || raw.isBlank()) {
			return 0L;
		}
		try {
			return Long.parseLong(raw.trim());
		} catch (NumberFormatException ex) {
			redis.delete(key);
			return 0L;
		}
	}

	private static String normalize(String email) {
		return email == null ? "" : email.trim().toLowerCase();
	}
}
