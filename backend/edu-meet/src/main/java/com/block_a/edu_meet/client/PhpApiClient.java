package com.block_a.edu_meet.client;

import com.block_a.edu_meet.exception.ApiException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class PhpApiClient {

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String baseUrl;

	@Autowired
	public PhpApiClient(@Value("${app.php.base-url}") String baseUrl) {
		HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(10));
		this.restClient = RestClient.builder().requestFactory(requestFactory).build();
		this.objectMapper = new ObjectMapper();
		this.baseUrl = trimTrailingSlash(baseUrl);
	}

	PhpApiClient(RestClient restClient, ObjectMapper objectMapper, String baseUrl) {
		this.restClient = restClient;
		this.objectMapper = objectMapper;
		this.baseUrl = trimTrailingSlash(baseUrl);
	}

	public ResponseEntity<JsonNode> forward(
			HttpMethod method,
			String phpFile,
			MultiValueMap<String, String> query,
			String authorization,
			JsonNode body) {
		UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(baseUrl + "/" + phpFile);
		if (query != null && !query.isEmpty()) {
			uriBuilder.queryParams(query);
		}
		URI uri = uriBuilder.build(true).toUri();

		try {
			RestClient.RequestBodySpec request = restClient.method(method).uri(uri);

			if (authorization != null && !authorization.isBlank()) {
				request.header(HttpHeaders.AUTHORIZATION, authorization);
			}

			if (body != null && method != HttpMethod.GET && method != HttpMethod.DELETE) {
				request.contentType(MediaType.APPLICATION_JSON);
				return request.body(body).exchange((req, response) -> toResponse(response));
			}

			return request.exchange((req, response) -> toResponse(response));
		} catch (ApiException ex) {
			throw ex;
		} catch (RestClientException ex) {
			throw new ApiException("PHP API service is unavailable", HttpStatus.BAD_GATEWAY);
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
				throw new ApiException("PHP API service returned an unreadable response", HttpStatus.BAD_GATEWAY);
			}
		}
		return ResponseEntity.status(response.getStatusCode()).body(body);
	}

	private static String trimTrailingSlash(String value) {
		String trimmed = Objects.requireNonNull(value, "baseUrl").trim();
		while (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}
}
