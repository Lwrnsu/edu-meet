package com.block_a.edu_meet.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.block_a.edu_meet.exception.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PhpLoginClientTest {

	private static final String LOGIN_URL = "http://localhost/edu-meet/php/api/auth/login.php";
	private static final String SYSTEM_ADMIN_LOGIN_URL =
			"http://localhost/edu-meet/php/api/auth/system_admin_login.php";
	private static final String SCHOOL_LOGIN_URL =
			"http://localhost/edu-meet/php/api/auth/school_login.php";
	private static final String SIGNUP_URL = "http://localhost/edu-meet/php/api/auth/signup.php";

	private MockRestServiceServer server;
	private PhpLoginClient client;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		client = new PhpLoginClient(
				builder.build(),
				new ObjectMapper(),
				LOGIN_URL,
				SYSTEM_ADMIN_LOGIN_URL,
				SCHOOL_LOGIN_URL,
				SIGNUP_URL);
	}

	@Test
	void loginReturnsPhpSuccessBody() {
		server.expect(requestTo(LOGIN_URL))
				.andExpect(method(HttpMethod.POST))
				.andExpect(content().json("{\"email\":\"lwrnsu@example.com\",\"password\":\"secret\"}"))
				.andRespond(withSuccess(
						"{\"token\":\"php-token\",\"token_type\":\"Bearer\",\"user\":{\"user_id\":1,\"email\":\"lwrnsu@example.com\"}}",
						MediaType.APPLICATION_JSON));

		ResponseEntity<JsonNode> response = client.login("lwrnsu@example.com", "secret");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody().get("token").asText()).isEqualTo("php-token");
		assertThat(response.getBody().get("token_type").asText()).isEqualTo("Bearer");
		assertThat(response.getBody().get("user").get("user_id").asInt()).isEqualTo(1);
		server.verify();
	}

	@Test
	void loginPassesThroughPhpErrorStatus() {
		server.expect(requestTo(LOGIN_URL))
				.andRespond(withStatus(HttpStatus.UNAUTHORIZED)
						.contentType(MediaType.APPLICATION_JSON)
						.body("{\"status\":401,\"message\":\"Invalid email or password\"}"));

		ResponseEntity<JsonNode> response = client.login("lwrnsu@example.com", "wrong");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(response.getBody().get("message").asText()).isEqualTo("Invalid email or password");
		server.verify();
	}

	@Test
	void loginRejectsUnreadablePhpBody() {
		server.expect(requestTo(LOGIN_URL))
				.andRespond(withSuccess("<html>fatal</html>", MediaType.TEXT_HTML));

		assertThatThrownBy(() -> client.login("lwrnsu@example.com", "secret"))
				.isInstanceOf(ApiException.class)
				.hasMessage("PHP login service returned an unreadable response")
				.extracting(ex -> ((ApiException) ex).getStatus())
				.isEqualTo(HttpStatus.BAD_GATEWAY);
		server.verify();
	}

	@Test
	void systemAdminLoginPostsToAdminUrl() {
		server.expect(requestTo(SYSTEM_ADMIN_LOGIN_URL))
				.andExpect(method(HttpMethod.POST))
				.andExpect(content().json("{\"email\":\"admin@example.com\",\"password\":\"secret\"}"))
				.andRespond(withSuccess(
						"{\"access_token\":\"php-token\",\"user\":{\"user_id\":1,\"email\":\"admin@example.com\"}}",
						MediaType.APPLICATION_JSON));

		ResponseEntity<JsonNode> response = client.systemAdminLogin("admin@example.com", "secret");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody().get("access_token").asText()).isEqualTo("php-token");
		server.verify();
	}

	@Test
	void systemAdminLoginMapsPhpCookiesIntoBody() {
		server.expect(requestTo(SYSTEM_ADMIN_LOGIN_URL))
				.andRespond(withSuccess(
								"{\"user\":{\"user_id\":6,\"email\":\"admin@example.com\"}}",
								MediaType.APPLICATION_JSON)
						.header(HttpHeaders.SET_COOKIE, "edu_meet_token=access-from-cookie; Path=/; HttpOnly")
						.header(HttpHeaders.SET_COOKIE, "edu_meet_refresh=refresh-from-cookie; Path=/; HttpOnly"));

		ResponseEntity<JsonNode> response = client.systemAdminLogin("admin@example.com", "secret");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody().get("user").get("user_id").asInt()).isEqualTo(6);
		assertThat(response.getBody().get("access_token").asText()).isEqualTo("access-from-cookie");
		assertThat(response.getBody().get("refresh_token").asText()).isEqualTo("refresh-from-cookie");
		server.verify();
	}

	@Test
	void systemAdminLoginKeepsBodyTokensOverCookies() {
		server.expect(requestTo(SYSTEM_ADMIN_LOGIN_URL))
				.andRespond(withSuccess(
								"{\"access_token\":\"body-access\",\"refresh_token\":\"body-refresh\",\"user\":{\"user_id\":1}}",
								MediaType.APPLICATION_JSON)
						.header(HttpHeaders.SET_COOKIE, "edu_meet_token=cookie-access; Path=/")
						.header(HttpHeaders.SET_COOKIE, "edu_meet_refresh=cookie-refresh; Path=/"));

		ResponseEntity<JsonNode> response = client.systemAdminLogin("admin@example.com", "secret");

		assertThat(response.getBody().get("access_token").asText()).isEqualTo("body-access");
		assertThat(response.getBody().get("refresh_token").asText()).isEqualTo("body-refresh");
		server.verify();
	}

	@Test
	void systemAdminLoginPassesThroughForbidden() {
		server.expect(requestTo(SYSTEM_ADMIN_LOGIN_URL))
				.andRespond(withStatus(HttpStatus.FORBIDDEN)
						.contentType(MediaType.APPLICATION_JSON)
						.body("{\"status\":403,\"message\":\"Not authorized as system admin\"}"));

		ResponseEntity<JsonNode> response = client.systemAdminLogin("user@example.com", "secret");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(response.getBody().get("message").asText()).isEqualTo("Not authorized as system admin");
		server.verify();
	}
}
