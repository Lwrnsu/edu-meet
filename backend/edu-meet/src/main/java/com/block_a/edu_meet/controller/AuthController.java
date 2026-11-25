package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.client.PhpApiClient;
import com.block_a.edu_meet.client.PhpLoginClient;
import com.block_a.edu_meet.dto.LoginRequest;
import com.block_a.edu_meet.dto.LoginResponse;
import com.block_a.edu_meet.dto.SignupRequest;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
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

        public AuthController(AuthService authService, PhpLoginClient phpLoginClient, PhpApiClient phpApiClient) {
                this.authService = authService;
                this.phpLoginClient = phpLoginClient;
                this.phpApiClient = phpApiClient;
        }

        @PostMapping("/login")
        public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
                LoginResponse response = authService.login(request);
                int userId = (response.getUser() != null && response.getUser().getId() != null)
                                ? response.getUser().getId()
                                : 0;
                String redisToken = com.block_a.edu_meet.services.AuthService.createAuthToken(
                                new LogInModel(userId, "USER"));
                return ResponseEntity.ok()
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + redisToken)
                                .body(response);
        }

        @PostMapping("/php-login")
        public ResponseEntity<JsonNode> loginWithPhp(@RequestBody LoginRequest request) {
                return withRedisAuthorizationHeader(
                                phpLoginClient.login(request.getEmail(), request.getPassword()),
                                "USER");
        }

        @PostMapping("/php-system-admin-login")
        public ResponseEntity<JsonNode> systemAdminLoginWithPhp(@RequestBody LoginRequest request) {
                return withRedisAuthorizationHeader(
                                phpLoginClient.systemAdminLogin(request.getEmail(), request.getPassword()),
                                "SYSTEM_ADMIN");
        }

        @PostMapping("/php-school-login")
        public ResponseEntity<JsonNode> schoolLoginWithPhp(@RequestBody LoginRequest request) {
                return withRedisAuthorizationHeader(
                                phpLoginClient.schoolLogin(request.getEmail(), request.getPassword()),
                                "SCHOOL_ADMIN");
        }

        @PostMapping("/php-college-admin-login")
        public ResponseEntity<JsonNode> collegeAdminLoginWithPhp(@RequestBody LoginRequest request) {
                return withRedisAuthorizationHeader(
                                phpLoginClient.schoolLogin(request.getEmail(), request.getPassword()),
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

        @PostMapping("/php-forgot-request-password-otp")
        public ResponseEntity<JsonNode> forgotRequestPasswordOtp(
                        @RequestBody(required = false) JsonNode body,
                        HttpServletRequest request) {
                return phpApiClient.forward(
                                HttpMethod.POST,
                                "auth/forgot_request_password_otp.php",
                                null,
                                authorization(request),
                                body);
        }

        @PostMapping("/php-forgot-verify-password-otp")
        public ResponseEntity<JsonNode> forgotVerifyPasswordOtp(
                        @RequestBody(required = false) JsonNode body,
                        HttpServletRequest request) {
                return phpApiClient.forward(
                                HttpMethod.POST,
                                "auth/forgot_verify_password_otp.php",
                                null,
                                authorization(request),
                                body);
        }

        @PostMapping("/php-forgot-reset-password")
        public ResponseEntity<JsonNode> forgotResetPassword(
                        @RequestBody(required = false) JsonNode body,
                        HttpServletRequest request) {
                return phpApiClient.forward(
                                HttpMethod.POST,
                                "auth/forgot_reset_password.php",
                                null,
                                authorization(request),
                                body);
        }

        private ResponseEntity<JsonNode> withRedisAuthorizationHeader(
                        ResponseEntity<JsonNode> response, String defaultRole) {
                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                        return response;
                }

                JsonNode body = response.getBody();
                int userId = extractUserId(body);
                String role = extractUserRole(body, defaultRole);
                String redisToken = com.block_a.edu_meet.services.AuthService.createAuthToken(
                                new LogInModel(userId, role));

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
