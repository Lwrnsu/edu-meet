package com.block_a.edu_meet.ai;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    public record ChatRequest(String sessionId, String message) {}
    public record ChatResponse(String reply, List<String> sources) {}

    private final GeminiChatService gemini;
    private final ChatSessionStore sessions;
    private final PdfAttachment attachment;
    private final ReviewerCollector reviewer;
    private final SourceCollector sources;
    private final ObjectMapper json;
    private final int maxMessageChars;
    private final long maxPdfBytes;

    public ChatController(GeminiChatService gemini,
                          ChatSessionStore sessions,
                          PdfAttachment attachment,
                          ReviewerCollector reviewer,
                          SourceCollector sources,
                          ObjectMapper json,
                          @Value("${edu-meet.chat.max-message-chars:4000}") int maxMessageChars,
                          @Value("${edu-meet.chat.max-pdf-bytes:8388608}") long maxPdfBytes) {
        this.gemini = gemini;
        this.sessions = sessions;
        this.attachment = attachment;
        this.reviewer = reviewer;
        this.sources = sources;
        this.json = json;
        this.maxMessageChars = maxMessageChars;
        this.maxPdfBytes = maxPdfBytes;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ChatResponse chat(@RequestBody ChatRequest req) {
        String sessionId = requireSessionId(req.sessionId());
        String message = requireMessage(req.message());

        return respond(sessionId, message, false);
    }

    // Accepts one or more PDFs together with the question in a single multipart
    // request: the chat UI sends the files and the message as parts, the backend
    // stores them temporarily and hands them to the extraction tool for this
    // request only.
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ChatResponse chat(@RequestPart("sessionId") String sessionId,
                             @RequestPart("message") String message,
                             @RequestPart(value = "file", required = false) List<MultipartFile> files) {
        String session = requireSessionId(sessionId);
        String text = requireMessage(message);

        List<Path> uploaded = List.of();
        try {
            uploaded = saveTempFiles(files);
            if (!uploaded.isEmpty()) {
                attachment.set(uploaded);
            }
            return respond(session, text, !uploaded.isEmpty());
        } finally {
            // Always release the files, whether the model answered or not.
            attachment.clear();
            uploaded.forEach(this::deleteQuietly);
        }
    }

    // One user turn: shorten the history, append, ask the model, and roll the
    // turn back if the model fails so a broken exchange cannot poison the session.
    private ChatResponse respond(String sessionId, String message, boolean withPdf) {
        List<Map<String, Object>> history = sessions.history(sessionId);

        synchronized (history) {
            sessions.trim(history);
            int start = history.size();

            // The attachment itself is exposed through the tool, never as a path.
            String userText = withPdf
                    ? message + "\n\n[The user attached one PDF to this message.]"
                    : message;

            try {
                history.add(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userText))
                ));

                // The service appends the model turn and any tool turns to the
                // same list, so the next request already has the full context.
                return new ChatResponse(replyOf(gemini.chat(history)), sources.get());
            } catch (RuntimeException e) {
                while (history.size() > start) {
                    history.removeLast();
                }
                throw e;
            } finally {
                reviewer.clear();
                sources.clear();
            }
        }
    }

    // A reviewer submitted through the tool wins over the model's own sentence:
    // it is already validated structure, so it is serialised here.
    private String replyOf(String modelReply) {
        ReviewerCollector.Result reviewed = reviewer.get();

        if (reviewed == null || reviewed.items().isEmpty()) {
            return modelReply;
        }

        String items;
        try {
            items = json.writeValueAsString(reviewed.items());
        } catch (JacksonException e) {
            return modelReply;
        }

        String note = reviewed.note();
        return note == null || note.isBlank() ? items : note + "\n" + items;
    }

    private String requireSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId is required");
        }
        if (sessionId.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId must be 64 characters or fewer");
        }
        return sessionId;
    }

    private String requireMessage(String message) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message is required");
        }
        if (message.length() > maxMessageChars) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "message must be " + maxMessageChars + " characters or fewer");
        }
        return message;
    }

    private List<Path> saveTempFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }

        List<Path> saved = new ArrayList<>(files.size());

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            if (file.getSize() > maxPdfBytes) {
                saved.forEach(this::deleteQuietly);
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                        "Each PDF must be " + (maxPdfBytes / (1024 * 1024)) + " MB or smaller");
            }

            try {
                Path target = Files.createTempFile("edu-meet-pdf-", ".pdf");
                saved.add(target);
                file.transferTo(target);
            } catch (IOException e) {
                saved.forEach(this::deleteQuietly);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Could not store the uploaded PDF");
            }
        }

        return saved;
    }

    private void deleteQuietly(Path file) {
        if (file == null) {
            return;
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // best effort cleanup of the temporary upload
        }
    }
}
