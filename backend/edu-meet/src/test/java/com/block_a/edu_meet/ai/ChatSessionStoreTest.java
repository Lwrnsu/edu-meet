package com.block_a.edu_meet.ai;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatSessionStoreTest {

    @Test
    void keepsTheMostRecentTurnsAndStartsOnAUserTurn() {
        ChatSessionStore store = new ChatSessionStore(10, 2, 60);
        List<Map<String, Object>> history = new ArrayList<>();

        for (int turn = 1; turn <= 4; turn++) {
            history.add(user("question " + turn));
            history.add(model("answer " + turn));
        }

        store.trim(history);

        // Last two exchanges only: user3, model3, user4, model4.
        assertEquals(4, history.size());
        assertTrue(textOf(history.getFirst()).contains("question 3"));
        assertEquals("user", history.getFirst().get("role"));
    }

    @Test
    void oldToolOutputIsShrunkButRecentOnesAreKept() {
        ChatSessionStore store = new ChatSessionStore(10, 12, 60);
        List<Map<String, Object>> history = new ArrayList<>();

        // Exchange 1 had a big PDF extraction, then three more plain exchanges.
        history.add(user("reviewer please"));
        history.add(model("reading the pdf"));
        history.add(toolResponse("x".repeat(5_000)));
        history.add(model("done"));
        for (int turn = 2; turn <= 4; turn++) {
            history.add(user("question " + turn));
            history.add(model("answer " + turn));
        }

        store.trim(history);

        String shrunk = toolTextOf(history.get(2));
        assertTrue(shrunk.contains("removed"), "old PDF text should be replaced");
        assertFalse(shrunk.contains("xxxxx"), "the full text should be gone");
    }

    @Test
    void oldestSessionsAreDroppedWhenThereAreTooMany() {
        ChatSessionStore store = new ChatSessionStore(2, 12, 60);

        store.history("a");
        store.history("b");
        store.history("c");

        assertEquals(2, store.sessionCount());
    }

    @Test
    void sameSessionReusesItsHistory() {
        ChatSessionStore store = new ChatSessionStore(10, 12, 60);

        store.history("a").add(user("hello"));

        assertEquals(1, store.history("a").size());
    }

    @Test
    void removingASessionDropsItsHistory() {
        ChatSessionStore store = new ChatSessionStore(10, 12, 60);
        store.history("a").add(Map.of("role", "user", "parts", List.of(Map.of("text", "hi"))));

        store.remove("a");

        assertEquals(0, store.sessionCount());
    }

    private static Map<String, Object> user(String text) {
        return Map.of("role", "user", "parts", List.of(Map.of("text", text)));
    }

    private static Map<String, Object> model(String text) {
        return Map.of("role", "model", "parts", List.of(Map.of("text", text)));
    }

    private static Map<String, Object> toolResponse(String extractedText) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("text", extractedText);

        Map<String, Object> functionResponse = new LinkedHashMap<>();
        functionResponse.put("name", "extractPdfText");
        functionResponse.put("response", response);

        Map<String, Object> part = new LinkedHashMap<>();
        part.put("functionResponse", functionResponse);

        return Map.of("role", "user", "parts", List.of(part));
    }

    @SuppressWarnings("unchecked")
    private static String textOf(Map<String, Object> turn) {
        List<Map<String, Object>> parts = (List<Map<String, Object>>) turn.get("parts");
        return (String) parts.getFirst().get("text");
    }

    @SuppressWarnings("unchecked")
    private static String toolTextOf(Map<String, Object> turn) {
        List<Map<String, Object>> parts = (List<Map<String, Object>>) turn.get("parts");
        Map<String, Object> functionResponse = (Map<String, Object>) parts.getFirst().get("functionResponse");
        Map<String, Object> response = (Map<String, Object>) functionResponse.get("response");
        return (String) response.get("text");
    }
}
