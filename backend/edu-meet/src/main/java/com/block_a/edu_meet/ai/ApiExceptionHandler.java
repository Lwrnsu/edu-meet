package com.block_a.edu_meet.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

// Every failure the UI can hit comes back as {"error": "..."} with a status
// the frontend understands, instead of Spring's default page or an empty body.
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private final int maxFiles;
    private final long maxPdfBytes;

    public ApiExceptionHandler(@Value("${edu-meet.chat.max-files:5}") int maxFiles,
                               @Value("${edu-meet.chat.max-pdf-bytes:8388608}") long maxPdfBytes) {
        this.maxFiles = maxFiles;
        this.maxPdfBytes = maxPdfBytes;
    }

    // Validation problems keep their own status and message.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> requestRejected(ResponseStatusException e) {
        String reason = e.getReason() == null ? "The request was rejected" : e.getReason();
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", reason));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    public Map<String, String> uploadTooLarge(MaxUploadSizeExceededException e) {
        long mb = maxPdfBytes / (1024 * 1024);
        log.warn("Rejected an upload above {} files / {} MB each", maxFiles, mb);
        return Map.of("error", "Up to " + maxFiles + " PDFs, " + mb
                + " MB each (" + (maxFiles * mb) + " MB total). "
                + "Please attach fewer or smaller files.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> unreadableBody(HttpMessageNotReadableException e) {
        return Map.of("error", "The request body could not be read");
    }

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
