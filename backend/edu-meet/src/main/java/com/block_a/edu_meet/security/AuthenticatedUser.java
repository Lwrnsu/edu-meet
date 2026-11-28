package com.block_a.edu_meet.security;

import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.models.LogInModel;
import java.util.Locale;
import java.util.Map;

public record AuthenticatedUser(int id, String role, String email, String displayName) {

	public static AuthenticatedUser from(LogInModel session) {
		if (session == null || session.getId() <= 0) {
			return null;
		}

		Map<String, Object> details = session.getUser();
		String email = text(details, "email");
		String displayName = firstText(details, "full_name", "fullName", "name");
		if (displayName == null) {
			String firstName = text(details, "first_name", "firstName");
			String lastName = text(details, "last_name", "lastName");
			displayName = joinNames(firstName, lastName);
		}
		if (displayName == null) {
			displayName = email != null ? email : Integer.toString(session.getId());
		}

		return new AuthenticatedUser(session.getId(), session.getRole(), email, displayName);
	}

	public static AuthenticatedUser from(User user) {
		if (user == null || user.getId() == null || user.getId() <= 0) {
			return null;
		}

		String displayName = joinNames(user.getFirstName(), user.getLastName());
		if (displayName == null) {
			displayName = user.getEmail();
		}
		return new AuthenticatedUser(user.getId(), "user", user.getEmail(), displayName);
	}

	public String normalizedRole() {
		if (role == null) {
			return "";
		}

		String normalized = role.trim().toLowerCase(Locale.ROOT);
		if (normalized.startsWith("role_")) {
			normalized = normalized.substring("role_".length());
		}
		return normalized.replaceAll("[\\s-]+", "_");
	}

	public boolean hasAnyRole(String... roles) {
		String currentRole = normalizedRole();
		for (String roleName : roles) {
			if (currentRole.equals(normalize(roleName))) {
				return true;
			}
		}
		return false;
	}

	private static String normalize(String value) {
		if (value == null) {
			return "";
		}
		return value.trim().toLowerCase(Locale.ROOT).replaceAll("[\\s-]+", "_");
	}

	private static String firstText(Map<String, Object> values, String... keys) {
		for (String key : keys) {
			String value = text(values, key);
			if (value != null) {
				return value;
			}
		}
		return null;
	}

	private static String text(Map<String, Object> values, String... keys) {
		if (values == null) {
			return null;
		}
		for (String key : keys) {
			Object value = values.get(key);
			if (value instanceof String text && !text.isBlank()) {
				return text.trim();
			}
		}
		return null;
	}

	private static String joinNames(String firstName, String lastName) {
		String joined = ((firstName == null ? "" : firstName.trim()) + " "
				+ (lastName == null ? "" : lastName.trim())).trim();
		return joined.isEmpty() ? null : joined;
	}
}
