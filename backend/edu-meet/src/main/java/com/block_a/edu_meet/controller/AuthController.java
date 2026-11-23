package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpApiClient;
import com.block_a.edu_meet.client.PhpLoginClient;
import com.block_a.edu_meet.dto.LoginRequest;
import com.block_a.edu_meet.dto.LoginResponse;
import com.block_a.edu_meet.dto.SignupRequest;
import com.block_a.edu_meet.service.AuthService;
import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
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
	private final PhpApiClient phpApiClient;

	public AuthController(AuthService authService, PhpLoginClient phpLoginClient, PhpApiClient phpApiClient) {
		this.authService = authService;
		this.phpLoginClient = phpLoginClient;
		this.phpApiClient = phpApiClient;
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(authService.login(request));
	}

	@PostMapping("/php-login")
	public ResponseEntity<JsonNode> loginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginClient.login(request.getEmail(), request.getPassword());
	}

	@PostMapping("/php-system-admin-login")
	public ResponseEntity<JsonNode> systemAdminLoginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginClient.systemAdminLogin(request.getEmail(), request.getPassword());
	}

	@PostMapping("/php-school-login")
	public ResponseEntity<JsonNode> schoolLoginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginClient.schoolLogin(request.getEmail(), request.getPassword());
	}

	/** Compatibility alias for school portal login. */
	@PostMapping("/php-college-admin-login")
	public ResponseEntity<JsonNode> collegeAdminLoginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginClient.schoolLogin(request.getEmail(), request.getPassword());
	}

	@PostMapping("/php-signup")
	public ResponseEntity<JsonNode> signupWithPhp(@RequestBody SignupRequest request) {
		return phpLoginClient.signup(request.toPhpPayload());
	}

	@PostMapping("/php-request-password-otp")
	public ResponseEntity<JsonNode> requestPasswordOtp(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(
				HttpMethod.POST,
				"auth/request_password_otp.php",
				null,
				authorization(request),
				body);
	}

	@PostMapping("/php-verify-password-otp")
	public ResponseEntity<JsonNode> verifyPasswordOtp(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(
				HttpMethod.POST,
				"auth/verify_password_otp.php",
				null,
				authorization(request),
				body);
	}

	@PostMapping("/php-change-password")
	public ResponseEntity<JsonNode> changePassword(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return phpApiClient.forward(
				HttpMethod.POST,
				"auth/change_password.php",
				null,
				authorization(request),
				body);
	}

	private static String authorization(HttpServletRequest request) {
		return request.getHeader(HttpHeaders.AUTHORIZATION);
	}
}
