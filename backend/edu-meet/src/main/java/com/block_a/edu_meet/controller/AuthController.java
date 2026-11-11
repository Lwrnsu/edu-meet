package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpLoginClient;
import com.block_a.edu_meet.dto.LoginRequest;
import com.block_a.edu_meet.dto.LoginResponse;
import com.block_a.edu_meet.service.AuthService;
import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final PhpLoginClient phpLoginClient;

	public AuthController(AuthService authService, PhpLoginClient phpLoginClient) {
		this.authService = authService;
		this.phpLoginClient = phpLoginClient;
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(authService.login(request));
	}

	@PostMapping("/php-login")
	public ResponseEntity<JsonNode> loginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginClient.login(request.getEmail(), request.getPassword());
	}
}
