package com.block_a.edu_meet.client;

import com.block_a.edu_meet.exception.ApiException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class PhpLoginClient {

	private static final String ACCESS_COOKIE = "edu_meet_token";
	private static final String REFRESH_COOKIE = "edu_meet_refresh";

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String loginUrl;
	private final String systemAdminLoginUrl;

	@Autowired
	public PhpLoginClient(
			@Value("${app.php.login-url}") String loginUrl,
			@Value("${app.php.system-admin-login-url}") String systemAdminLoginUrl) {
		HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(10));
		this.restClient = RestClient.builder().requestFactory(requestFactory).build();
		this.objectMapper = new ObjectMapper();
		this.loginUrl = loginUrl;
		this.systemAdminLoginUrl = systemAdminLoginUrl;
	}

	PhpLoginClient(RestClient restClient, ObjectMapper objectMapper, String loginUrl, String systemAdminLoginUrl) {
		this.restClient = restClient;
		this.objectMapper = objectMapper;
		this.loginUrl = loginUrl;
		this.systemAdminLoginUrl = systemAdminLoginUrl;
	}

	public ResponseEntity<JsonNode> login(String email, String password) {
		return postLogin(loginUrl, email, password);
	}

	public ResponseEntity<JsonNode> systemAdminLogin(String email, String password) {
		return postLogin(systemAdminLoginUrl, email, password);
	}

	private ResponseEntity<JsonNode> postLogin(String url, String email, String password) {
		Map<String, String> payload = new LinkedHashMap<>();
		payload.put("email", email == null ? "" : email);
		payload.put("password", password == null ? "" : password);

		try {
			return restClient.post()
					.uri(url)
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

		ObjectNode objectBody;
		if (body instanceof ObjectNode node) {
			objectBody = node;
		} else {
			objectBody = objectMapper.createObjectNode();
			objectBody.set("data", body);
		}

		putCookieToken(objectBody, response, ACCESS_COOKIE, "access_token");
		putCookieToken(objectBody, response, REFRESH_COOKIE, "refresh_token");

		return ResponseEntity.status(response.getStatusCode()).body(objectBody);
	}

	private void putCookieToken(
			ObjectNode body,
			RestClient.RequestHeadersSpec.ConvertibleClientHttpResponse response,
			String cookieName,
			String fieldName) {
		JsonNode existing = body.get(fieldName);
		if (existing != null && existing.isTextual() && !existing.asText().isBlank()) {
			return;
		}
		String value = extractCookieValue(response.getHeaders().get(HttpHeaders.SET_COOKIE), cookieName);
		if (value != null && !value.isBlank()) {
			body.put(fieldName, value);
		}
	}

	static String extractCookieValue(List<String> setCookieHeaders, String cookieName) {
		if (setCookieHeaders == null || setCookieHeaders.isEmpty()) {
			return null;
		}
		String prefix = cookieName + "=";
		for (String header : setCookieHeaders) {
			if (header == null || header.isBlank()) {
				continue;
			}
			String firstSegment = header.split(";", 2)[0].trim();
			if (firstSegment.regionMatches(true, 0, prefix, 0, prefix.length())) {
				return firstSegment.substring(prefix.length());
			}
		}
		return null;
	}
}
