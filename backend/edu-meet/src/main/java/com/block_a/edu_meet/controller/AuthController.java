package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpApiClient;
import com.block_a.edu_meet.client.PhpLoginClient;
import com.block_a.edu_meet.dto.LoginRequest;
import com.block_a.edu_meet.dto.LoginResponse;
import com.block_a.edu_meet.dto.SignupRequest;
import com.block_a.edu_meet.exception.ApiException;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.service.AuthService;
import com.block_a.edu_meet.services.LoginAttemptService;
import com.block_a.edu_meet.services.OtpRateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.function.Supplier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final PhpLoginClient phpLoginClient;
	private final PhpApiClient phpApiClient;
	private final LoginAttemptService loginAttemptService;
	private final OtpRateLimitService otpRateLimitService;

	public AuthController(
			AuthService authService,
			PhpLoginClient phpLoginClient,
			PhpApiClient phpApiClient,
			LoginAttemptService loginAttemptService,
			OtpRateLimitService otpRateLimitService) {
		this.authService = authService;
		this.phpLoginClient = phpLoginClient;
		this.phpApiClient = phpApiClient;
		this.loginAttemptService = loginAttemptService;
		this.otpRateLimitService = otpRateLimitService;
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		loginAttemptService.assertNotLocked(request.getEmail());
		try {
			LoginResponse response = authService.login(request);
			loginAttemptService.clear(request.getEmail());
			int userId = (response.getUser() != null && response.getUser().getId() != null)
					? response.getUser().getId()
					: 0;
			String redisToken = com.block_a.edu_meet.services.AuthService.createAuthToken(
					new LogInModel(userId, "USER"));
			return ResponseEntity.ok()
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + redisToken)
					.body(response);
		} catch (ApiException ex) {
			if (ex.getStatus() == HttpStatus.UNAUTHORIZED || ex.getStatus() == HttpStatus.FORBIDDEN) {
				loginAttemptService.recordFailure(request.getEmail());
			}
			throw ex;
		}
	}

	@PostMapping("/php-login")
	public ResponseEntity<JsonNode> loginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginGuarded(
				request,
				() -> phpLoginClient.login(request.getEmail(), request.getPassword()),
				"USER");
	}

	@PostMapping("/php-system-admin-login")
	public ResponseEntity<JsonNode> systemAdminLoginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginGuarded(
				request,
				() -> phpLoginClient.systemAdminLogin(request.getEmail(), request.getPassword()),
				"SYSTEM_ADMIN");
	}

	@PostMapping("/php-school-login")
	public ResponseEntity<JsonNode> schoolLoginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginGuarded(
				request,
				() -> phpLoginClient.schoolLogin(request.getEmail(), request.getPassword()),
				"SCHOOL_ADMIN");
	}

	@PostMapping("/php-college-admin-login")
	public ResponseEntity<JsonNode> collegeAdminLoginWithPhp(@RequestBody LoginRequest request) {
		return phpLoginGuarded(
				request,
				() -> phpLoginClient.schoolLogin(request.getEmail(), request.getPassword()),
				"SCHOOL_ADMIN");
	}

	@PostMapping("/php-signup")
	public ResponseEntity<JsonNode> signupWithPhp(@RequestBody SignupRequest request) {
		return phpLoginClient.signup(request.toPhpPayload());
	}

	@PostMapping("/php-request-password-otp")
	public ResponseEntity<JsonNode> requestPasswordOtp(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return otpSendGuarded(body, request, "auth/request_password_otp.php");
	}

	@PostMapping("/php-verify-password-otp")
	public ResponseEntity<JsonNode> verifyPasswordOtp(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return otpVerifyGuarded(body, request, "auth/verify_password_otp.php");
	}

	@PostMapping("/php-change-password")
	public ResponseEntity<JsonNode> changePassword(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return otpVerifyGuarded(body, request, "auth/change_password.php");
	}

	@PostMapping("/php-forgot-request-password-otp")
	public ResponseEntity<JsonNode> forgotRequestPasswordOtp(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return otpSendGuarded(body, request, "auth/forgot_request_password_otp.php");
	}

	@PostMapping("/php-forgot-verify-password-otp")
	public ResponseEntity<JsonNode> forgotVerifyPasswordOtp(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return otpVerifyGuarded(body, request, "auth/forgot_verify_password_otp.php");
	}

	@PostMapping("/php-forgot-reset-password")
	public ResponseEntity<JsonNode> forgotResetPassword(
			@RequestBody(required = false) JsonNode body,
			HttpServletRequest request) {
		return otpVerifyGuarded(body, request, "auth/forgot_reset_password.php");
	}

	private ResponseEntity<JsonNode> phpLoginGuarded(
			LoginRequest request,
			Supplier<ResponseEntity<JsonNode>> loginCall,
			String defaultRole) {
		loginAttemptService.assertNotLocked(request.getEmail());
		ResponseEntity<JsonNode> response = loginCall.get();
		if (response.getStatusCode().is2xxSuccessful()) {
			loginAttemptService.clear(request.getEmail());
			return withRedisAuthorizationHeader(response, defaultRole);
		}
		loginAttemptService.recordFailure(request.getEmail());
		return response;
	}

	private ResponseEntity<JsonNode> otpSendGuarded(
			JsonNode body,
			HttpServletRequest request,
			String phpPath) {
		String email = extractEmail(body);
		otpRateLimitService.assertCanSend(email);
		ResponseEntity<JsonNode> response = phpApiClient.forward(
				HttpMethod.POST,
				phpPath,
				null,
				authorization(request),
				body);
		if (response.getStatusCode().is2xxSuccessful()) {
			otpRateLimitService.recordSend(email);
		}
		return response;
	}

	private ResponseEntity<JsonNode> otpVerifyGuarded(
			JsonNode body,
			HttpServletRequest request,
			String phpPath) {
		String email = extractEmail(body);
		otpRateLimitService.assertCanVerify(email);
		ResponseEntity<JsonNode> response = phpApiClient.forward(
				HttpMethod.POST,
				phpPath,
				null,
				authorization(request),
				body);
		if (response.getStatusCode().is2xxSuccessful()) {
			otpRateLimitService.clearVerifyFailures(email);
		} else {
			otpRateLimitService.recordVerifyFailure(email);
		}
		return response;
	}

	private static String extractEmail(JsonNode body) {
		if (body == null || body.isNull()) {
			return "";
		}
		JsonNode emailNode = body.path("email");
		if (emailNode.isTextual()) {
			return emailNode.asText();
		}
		return "";
	}

	private ResponseEntity<JsonNode> withRedisAuthorizationHeader(
			ResponseEntity<JsonNode> response, String defaultRole) {
		if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
			return response;
		}

		JsonNode body = response.getBody();
		int userId = extractUserId(body);
		String role = extractUserRole(body, defaultRole);
		JsonNode userNode = body.path("user");
		java.util.Map<String, Object> user = userNode.isObject()
				? com.block_a.edu_meet.services.AuthService.toMap(userNode.toString())
				: null;
		String redisToken = com.block_a.edu_meet.services.AuthService.createAuthToken(
				new LogInModel(userId, role, user));

		return ResponseEntity.status(response.getStatusCode())
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + redisToken)
				.body(body);
	}

	private static int extractUserId(JsonNode body) {
		JsonNode[] candidates = new JsonNode[] {
				body.path("user").path("user_id"),
				body.path("user").path("id"),
				body.path("data").path("user").path("user_id"),
				body.path("data").path("user").path("id"),
				body.path("user_id"),
				body.path("id")
		};
		for (JsonNode node : candidates) {
			if (node.isInt() || node.canConvertToInt()) {
				return node.asInt();
			}
			if (node.isTextual()) {
				try {
					return Integer.parseInt(node.asText().trim());
				} catch (NumberFormatException ignored) {
				}
			}
		}
		return 0;
	}

	private static String extractUserRole(JsonNode body, String defaultRole) {
		JsonNode[] candidates = new JsonNode[] {
				body.path("user").path("role"),
				body.path("user").path("role_name"),
				body.path("data").path("user").path("role"),
				body.path("role"),
				body.path("role_name")
		};
		for (JsonNode node : candidates) {
			if (node.isTextual() && !node.asText().isBlank()) {
				return node.asText().trim();
			}
		}
		JsonNode roles = body.path("user").path("roles");
		if (roles.isArray() && !roles.isEmpty() && roles.get(0).isTextual()) {
			return roles.get(0).asText().trim();
		}
		return defaultRole;
	}

	private static String authorization(HttpServletRequest request) {
		return request.getHeader(HttpHeaders.AUTHORIZATION);
	}
}
