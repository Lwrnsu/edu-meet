package com.block_a.edu_meet.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;

import com.block_a.edu_meet.ai.GeminiChatService.ModelResponseException;

import java.util.Map;

// Turns upstream failures into a small JSON error instead of Spring's
// default whitelabel page, so the frontend has something to show.
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(RestClientException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public Map<String, String> upstreamFailure(RestClientException e) {
        log.error("Gemini request failed", e);
        return Map.of("error", "The assistant is unavailable right now. Please try again.");
    }

    @ExceptionHandler(GeminiChatService.ModelResponseException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public Map<String, String> modelFailure(GeminiChatService.ModelResponseException e) {
        log.error("Unexpected model response", e);
        return Map.of("error", "The assistant could not answer that. Please try again.");
    }
}
