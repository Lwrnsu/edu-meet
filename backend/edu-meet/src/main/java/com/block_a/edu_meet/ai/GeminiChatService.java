package com.block_a.edu_meet.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.block_a.edu_meet.ai.tools.ToolRegistry;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Talks to Gemini and runs the function calling loop until the model
// answers in plain text instead of asking for a tool.
@Service
public class GeminiChatService {

    // Stops a model that keeps asking for tools from looping forever.
    private static final int MAX_TOOL_ROUNDS = 6;

    // Bounded upstream calls: without these a hung connection would hold a
    // request thread (and the session lock) indefinitely.
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MS = 300;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    private final RestClient http;
    private final ToolRegistry tools;
    private final String apiKey;
    private final String model;

    @Autowired
    public GeminiChatService(ToolRegistry tools,
                             @Value("${gemini.api-key}") String apiKey,
                             @Value("${gemini.model}") String model) {
        this(defaultClient(), tools, apiKey, model);
    }

    // Visible for tests: lets a caller supply an already configured client.
    public GeminiChatService(RestClient http, ToolRegistry tools, String apiKey, String model) {
        this.http = http;
        this.tools = tools;
        this.apiKey = apiKey;
        this.model = model;
    }

    private static RestClient defaultClient() {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(READ_TIMEOUT);

        return RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(factory)
                .build();
    }

    // Runs one user turn: keep calling tools until the model gives a text answer.
    public String chat(List<Map<String, Object>> contents) {
        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            Map<String, Object> content = contentOf(generate(contents));

            // Keep the raw content map. Gemini 3 attaches a thoughtSignature to
            // parts and expects it back verbatim when we send the function
            // results; rebuilding the parts by hand would drop it.
            contents.add(content);

            List<Map<String, Object>> calls = functionCallsIn(content);
            if (calls.isEmpty()) {
                return textOf(content);
            }

            contents.add(Map.of("role", "user", "parts", functionResponses(calls)));
        }

        throw new ModelResponseException(
                "The model kept requesting tools after " + MAX_TOOL_ROUNDS + " rounds.");
    }

    public static class ModelResponseException extends RuntimeException {
        public ModelResponseException(String message) {
            super(message);
        }
    }

    private Map<String, Object> generate(List<Map<String, Object>> contents) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("systemInstruction",
                Map.of("parts", List.of(Map.of("text", ChatPrompt.SYSTEM))));
        body.put("contents", contents);
        body.put("generationConfig",
                Map.of("thinkingConfig", Map.of("thinkingLevel", "low")));

        List<Map<String, Object>> declarations = tools.declarations();
        if (!declarations.isEmpty()) {
            body.put("tools", List.of(Map.of("functionDeclarations", declarations)));
        }

        RestClientException lastFailure = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                Map<String, Object> response = http.post()
                        .uri("/models/{model}:generateContent", model)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(JSON_OBJECT);

                return response == null ? Map.of() : response;
            } catch (RestClientException e) {
                if (!isRetryable(e) || attempt == MAX_ATTEMPTS) {
                    throw e;
                }
                lastFailure = e;
                sleepBeforeRetry(attempt);
            }
        }

        throw lastFailure;
    }

    // Only transient upstream failures are worth retrying; a 400 or a timeout
    // would just burn the user's time again.
    private static boolean isRetryable(RestClientException e) {
        return e instanceof HttpServerErrorException
                || e instanceof HttpClientErrorException.TooManyRequests;
    }

    private static void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(RETRY_BACKOFF_MS * attempt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ModelResponseException("Interrupted while retrying the model request");
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> contentOf(Map<String, Object> response) {
        List<Map<String, Object>> candidates =
                (List<Map<String, Object>>) response.get("candidates");

        if (candidates == null || candidates.isEmpty()) {
            throw new ModelResponseException("Gemini returned no candidates: " + response);
        }

        Map<String, Object> candidate = candidates.getFirst();
        Map<String, Object> content = (Map<String, Object>) candidate.get("content");

        if (content == null) {
            // Usually a safety block or a token limit — surface the reason.
            throw new ModelResponseException(
                    "Gemini returned no content (finishReason=" + candidate.get("finishReason") + ")");
        }

        return content;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> functionCallsIn(Map<String, Object> content) {
        Object rawParts = content.get("parts");
        if (!(rawParts instanceof List<?> parts)) {
            return List.of();
        }

        List<Map<String, Object>> calls = new ArrayList<>();
        for (Object part : parts) {
            if (part instanceof Map<?, ?> map && map.get("functionCall") instanceof Map<?, ?> call) {
                calls.add((Map<String, Object>) call);
            }
        }
        return calls;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> functionResponses(List<Map<String, Object>> calls) {
        List<Map<String, Object>> parts = new ArrayList<>(calls.size());

        for (Map<String, Object> call : calls) {
            String name = String.valueOf(call.get("name"));
            Map<String, Object> arguments = call.get("args") instanceof Map<?, ?> args
                    ? (Map<String, Object>) args
                    : Map.of();

            Map<String, Object> result = tools.invoke(name, arguments);

            parts.add(Map.of("functionResponse", Map.of(
                    "name", name,
                    "response", result
            )));
        }

        return parts;
    }

    // Joins the text parts of a turn, skipping the internal "thought" parts
    // that Gemini 3 sometimes includes.
    @SuppressWarnings("unchecked")
    private static String textOf(Map<String, Object> content) {
        Object rawParts = content.get("parts");
        if (!(rawParts instanceof List<?> parts)) {
            return "";
        }

        StringBuilder text = new StringBuilder();
        for (Object part : parts) {
            if (part instanceof Map<?, ?> map
                    && !Boolean.TRUE.equals(map.get("thought"))
                    && map.get("text") instanceof String chunk) {
                text.append(chunk);
            }
        }
        return text.toString().trim();
    }
}
