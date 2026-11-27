package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpApiClient;
import com.block_a.edu_meet.services.AuthService;
import java.util.LinkedHashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;

/**
 * Role / school-membership changes alter which role a user gets at login.
 * After a successful change, the affected user's Redis sessions are removed so the
 * next request re-logins and picks up the new role (no stale role in Redis).
 */
final class RoleSessionSync {

	private static final Logger log = LoggerFactory.getLogger(RoleSessionSync.class);

	private RoleSessionSync() {
	}

	static ResponseEntity<JsonNode> forward(
			PhpApiClient client,
			HttpMethod method,
			String phpFile,
			MultiValueMap<String, String> query,
			String authorization,
			JsonNode body) {
		Set<Integer> userIds = new LinkedHashSet<>();
		collectUserIds(userIds, body);

		// DELETE/PUT/PATCH only carry the row id, so look up which user the row belongs to first
		String rowId = query == null ? null : query.getFirst("id");
		if (rowId != null && method != HttpMethod.POST) {
			try {
				MultiValueMap<String, String> lookup = new LinkedMultiValueMap<>();
				lookup.add("id", rowId);
				ResponseEntity<JsonNode> row = client.forward(HttpMethod.GET, phpFile, lookup, authorization, null);
				if (row.getStatusCode().is2xxSuccessful()) {
					collectUserIds(userIds, row.getBody());
				}
			} catch (RuntimeException ex) {
				log.warn("Could not look up user for {} id {}: {}", phpFile, rowId, ex.getMessage());
			}
		}

		ResponseEntity<JsonNode> response = client.forward(method, phpFile, query, authorization, body);

		if (response.getStatusCode().is2xxSuccessful()) {
			collectUserIds(userIds, response.getBody());
			for (int userId : userIds) {
				try {
					AuthService.deleteUser(userId);
				} catch (RuntimeException ex) {
					log.warn("Could not clear Redis sessions for user {}: {}", userId, ex.getMessage());
				}
			}
		}
		return response;
	}

	private static void collectUserIds(Set<Integer> ids, JsonNode node) {
		if (node == null) {
			return;
		}
		if (node.isArray()) {
			for (JsonNode item : node) {
				collectUserIds(ids, item);
			}
			return;
		}
		JsonNode value = node.path("user_id");
		int id = 0;
		if (value.isTextual()) {
			try {
				id = Integer.parseInt(value.asText().trim());
			} catch (NumberFormatException ignored) {
				id = 0;
			}
		} else if (value.canConvertToInt()) {
			id = value.asInt();
		}
		if (id > 0) {
			ids.add(id);
		}
	}
}
