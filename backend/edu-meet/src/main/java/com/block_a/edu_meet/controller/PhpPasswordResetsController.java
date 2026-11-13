package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpApiClient;
import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/php/password-resets")
public class PhpPasswordResetsController {

	private final PhpApiClient phpApiClient;

	public PhpPasswordResetsController(PhpApiClient phpApiClient) {
		this.phpApiClient = phpApiClient;
	}

	@GetMapping
	public ResponseEntity<JsonNode> listOrGet(
			@RequestParam MultiValueMap<String, String> query,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.GET, "password_resets.php", query, authorization(request), null);
	}

	@PostMapping
	public ResponseEntity<JsonNode> create(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.POST, "password_resets.php", null, authorization(request), body);
	}

	@PutMapping
	public ResponseEntity<JsonNode> put(
			@RequestParam MultiValueMap<String, String> query,
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.PUT, "password_resets.php", query, authorization(request), body);
	}

	@PatchMapping
	public ResponseEntity<JsonNode> patch(
			@RequestParam MultiValueMap<String, String> query,
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.PATCH, "password_resets.php", query, authorization(request), body);
	}

	@DeleteMapping
	public ResponseEntity<JsonNode> delete(
			@RequestParam MultiValueMap<String, String> query,
			HttpServletRequest request) {
		return phpApiClient.forward(HttpMethod.DELETE, "password_resets.php", query, authorization(request), null);
	}

	private static String authorization(HttpServletRequest request) {
		return request.getHeader(HttpHeaders.AUTHORIZATION);
	}
}
