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
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PhpLoginClientTest {

	private static final String LOGIN_URL = "http://localhost/edu-meet/backend/edu-meet/php/api/auth/login.php";

	private MockRestServiceServer server;
	private PhpLoginClient client;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		client = new PhpLoginClient(builder.build(), new ObjectMapper(), LOGIN_URL);
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
}
