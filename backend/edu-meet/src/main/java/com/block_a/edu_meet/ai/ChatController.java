package com.block_a.edu_meet.ai;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    public record ChatRequest(String sessionId, String message) {}
    public record ChatResponse(String reply) {}

    private final Map<String, List<Map<String, Object>>> sessions = new ConcurrentHashMap<>();
    private final GeminiChatService gemini;

    public ChatController(GeminiChatService gemini) {
        this.gemini = gemini;
    }

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest req) {
        if (req.sessionId() == null || req.sessionId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId is required");
        }
        if (req.message() == null || req.message().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message is required");
        }

        List<Map<String, Object>> history =
                sessions.computeIfAbsent(req.sessionId(), key -> new ArrayList<>());

        synchronized (history) {
            history.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", req.message()))
            ));

            // The service appends the model turn and any tool turns to the
            // same list, so the next request already has the full context.
            String reply = gemini.chat(history);

            return new ChatResponse(reply);
        }
    }
}
