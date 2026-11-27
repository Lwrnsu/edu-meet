package com.block_a.edu_meet.security;

import com.block_a.edu_meet.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import io.jsonwebtoken.JwtException;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private final SecretKey secretKey;
	private final long expirationMs;

	public JwtService(
			@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration-ms}") long expirationMs) {
		this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.expirationMs = expirationMs;
	}

	public String generateToken(User user) {
		Date now = new Date();
		Date expiry = new Date(now.getTime() + expirationMs);
		return Jwts.builder()
				.subject(String.valueOf(user.getId()))
				.claim("email", user.getEmail())
				.issuedAt(now)
				.expiration(expiry)
				.signWith(secretKey)
				.compact();
	}

	public Integer extractUserId(String token) {
		return Integer.valueOf(parseClaims(token).getSubject());
	}

	public boolean isTokenValid(String token) {
		try {
			Claims claims = parseClaims(token);
			return claims.getExpiration().after(new Date());
		} catch (Exception ex) {
			return false;
		}
	}

	public Optional<VerifiedToken> verifyAccountToken(String token) {
		try {
			Claims claims = parseClaims(token);
			int userId = Integer.parseInt(claims.getSubject());
			Date expiration = claims.getExpiration();
			if (userId <= 0 || expiration == null || !expiration.toInstant().isAfter(Instant.now())) {
				return Optional.empty();
			}
			return Optional.of(new VerifiedToken(userId, expiration.toInstant()));
		} catch (JwtException | IllegalArgumentException exception) {
			return Optional.empty();
		}
	}

	public record VerifiedToken(int userId, Instant expiresAt) {}

	private Claims parseClaims(String token) {
		return Jwts.parser()
				.verifyWith(secretKey)
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}
}
