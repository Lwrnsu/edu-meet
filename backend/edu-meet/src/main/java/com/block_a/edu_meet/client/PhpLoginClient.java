package com.block_a.edu_meet.client;

import com.block_a.edu_meet.exception.ApiException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class PhpLoginClient {

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String loginUrl;

	@Autowired
	public PhpLoginClient(@Value("${app.php.login-url}") String loginUrl) {
		HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(10));
		this.restClient = RestClient.builder().requestFactory(requestFactory).build();
		this.objectMapper = new ObjectMapper();
		this.loginUrl = loginUrl;
	}

	PhpLoginClient(RestClient restClient, ObjectMapper objectMapper, String loginUrl) {
		this.restClient = restClient;
		this.objectMapper = objectMapper;
		this.loginUrl = loginUrl;
	}

	public ResponseEntity<JsonNode> login(String email, String password) {
		Map<String, String> payload = new LinkedHashMap<>();
		payload.put("email", email == null ? "" : email);
		payload.put("password", password == null ? "" : password);

		try {
			return restClient.post()
					.uri(loginUrl)
					.contentType(MediaType.APPLICATION_JSON)
					.body(payload)
					.exchange((request, response) -> toResponse(response));
		} catch (ApiException ex) {
			throw ex;
		} catch (RestClientException ex) {
			throw new ApiException("PHP login service is unavailable", HttpStatus.BAD_GATEWAY);
		}
	}

	private ResponseEntity<JsonNode> toResponse(RestClient.RequestHeadersSpec.ConvertibleClientHttpResponse response)
			throws IOException {
		byte[] bytes = response.getBody().readAllBytes();
		JsonNode body;
		if (bytes.length == 0) {
			body = objectMapper.createObjectNode();
		} else {
			try {
				body = objectMapper.readTree(bytes);
			} catch (JacksonException ex) {
				throw new ApiException("PHP login service returned an unreadable response", HttpStatus.BAD_GATEWAY);
			}
		}
		return ResponseEntity.status(response.getStatusCode()).body(body);
	}
}
