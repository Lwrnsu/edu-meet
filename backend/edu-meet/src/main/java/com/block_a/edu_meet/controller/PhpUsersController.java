package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpApiClient;
import com.block_a.edu_meet.services.AuthService;
import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/php/users")
public class PhpUsersController {

	private static final Logger log = LoggerFactory.getLogger(PhpUsersController.class);

	private final PhpApiClient phpApiClient;

	public PhpUsersController(PhpApiClient phpApiClient) {
		this.phpApiClient = phpApiClient;
	}

	@GetMapping
	public ResponseEntity<JsonNode> listOrGet(
			@RequestParam MultiValueMap<String, String> query,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.GET, "users.php", query, authorization(request), null);
	}

	@PostMapping
	public ResponseEntity<JsonNode> create(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.POST, "users.php", null, authorization(request), body);
	}

	@PutMapping
	public ResponseEntity<JsonNode> put(
			@RequestParam MultiValueMap<String, String> query,
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		ResponseEntity<JsonNode> response = phpApiClient.forward(HttpMethod.PUT, "users.php", query, authorization(request), body);
		syncRedisAfterUpdate(query, response);
		return response;
	}

	@PatchMapping
	public ResponseEntity<JsonNode> patch(
			@RequestParam MultiValueMap<String, String> query,
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		ResponseEntity<JsonNode> response = phpApiClient.forward(HttpMethod.PATCH, "users.php", query, authorization(request), body);
		syncRedisAfterUpdate(query, response);
		return response;
	}

	@DeleteMapping
	public ResponseEntity<JsonNode> delete(
			@RequestParam MultiValueMap<String, String> query,
			HttpServletRequest request) {
		ResponseEntity<JsonNode> response = phpApiClient.forward(HttpMethod.DELETE, "users.php", query, authorization(request), null);
		if (response.getStatusCode().is2xxSuccessful()) {
			try {
				AuthService.deleteUser(userId(query));
			} catch (RuntimeException ex) {
				log.warn("Could not remove deleted user's sessions from Redis: {}", ex.getMessage());
			}
		}
		return response;
	}

	/** PHP answers PUT/PATCH with the updated user, so push those fields into Redis too. */
	private static void syncRedisAfterUpdate(MultiValueMap<String, String> query, ResponseEntity<JsonNode> response) {
		JsonNode body = response.getBody();
		if (!response.getStatusCode().is2xxSuccessful() || body == null || !body.isObject()) {
			return;
		}
		try {
			AuthService.updateUser(userId(query), AuthService.toMap(body.toString()));
		} catch (RuntimeException ex) {
			log.warn("Could not update user's sessions in Redis: {}", ex.getMessage());
		}
	}

	private static int userId(MultiValueMap<String, String> query) {
		try {
			return Integer.parseInt(query.getFirst("id"));
		} catch (NumberFormatException ex) {
			return 0;
		}
	}

	private static String authorization(HttpServletRequest request) {
		return request.getHeader(HttpHeaders.AUTHORIZATION);
	}
}
