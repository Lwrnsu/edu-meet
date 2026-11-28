package com.block_a.edu_meet.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

// One history per session, kept from growing without limit: idle sessions
// expire, the oldest are dropped when there are too many, and a long
// conversation is shortened to its most recent turns.
@Component
public class ChatSessionStore {

    private static final Logger log = LoggerFactory.getLogger(ChatSessionStore.class);

    // Extracted PDF text is only kept in full for the most recent turns;
    // older copies are replaced by a marker so they stop being re-sent.
    private static final int KEEP_FULL_TOOL_TURNS = 2;
    private static final int SHRINK_ABOVE_CHARS = 2_000;
    private static final String SHRUNK =
            "[Earlier PDF text removed to keep the conversation small. "
                    + "Call extractPdfText again if you need it.]";

    private record Session(List<Map<String, Object>> history, AtomicLong lastUsed) {}

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final int maxSessions;
    private final int maxTurns;
    private final long ttlMillis;

    public ChatSessionStore(@Value("${edu-meet.chat.max-sessions:200}") int maxSessions,
                            @Value("${edu-meet.chat.max-turns:12}") int maxTurns,
                            @Value("${edu-meet.chat.session-ttl-minutes:60}") long ttlMinutes) {
        this.maxSessions = maxSessions;
        this.maxTurns = maxTurns;
        this.ttlMillis = ttlMinutes * 60_000L;
    }

    public List<Map<String, Object>> history(String sessionId) {
        long now = System.currentTimeMillis();
        evictExpired(now);

        Session session = sessions.computeIfAbsent(sessionId,
                id -> new Session(new ArrayList<>(), new AtomicLong(now)));
        session.lastUsed().set(now);

        if (sessions.size() > maxSessions) {
            evictOldest(sessions.size() - maxSessions);
        }
        return session.history();
    }

    // Keeps the last maxTurns exchanges and always starts at a user turn, so the
    // model never receives a tool response whose request was trimmed away.
    public void trim(List<Map<String, Object>> history) {
        List<Integer> starts = userTurnStarts(history);

        if (starts.size() > maxTurns) {
            int dropThrough = starts.get(starts.size() - maxTurns);
            history.subList(0, dropThrough).clear();
            starts = userTurnStarts(history);
        }

        int cutoff = starts.size() <= KEEP_FULL_TOOL_TURNS
                ? 0
                : starts.get(starts.size() - KEEP_FULL_TOOL_TURNS);

        for (int i = 0; i < cutoff; i++) {
            history.set(i, shrinkToolOutput(history.get(i)));
        }
    }

    public int sessionCount() {
        return sessions.size();
    }

    // Used when a user logs out: forget the conversation immediately instead of
    // waiting for the TTL.
    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    private static List<Integer> userTurnStarts(List<Map<String, Object>> history) {
        List<Integer> starts = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            if (isUserTurn(history.get(i))) {
                starts.add(i);
            }
        }
        return starts;
    }

    private static boolean isUserTurn(Map<String, Object> turn) {
        if (!"user".equals(turn.get("role"))) {
            return false;
        }
        if (!(turn.get("parts") instanceof List<?> parts)) {
            return false;
        }
        for (Object part : parts) {
            if (part instanceof Map<?, ?> map && map.get("text") instanceof String) {
                return true;
            }
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> shrinkToolOutput(Map<String, Object> turn) {
        if (!(turn.get("parts") instanceof List<?> rawParts)) {
            return turn;
        }

        boolean changed = false;
        List<Map<String, Object>> parts = new ArrayList<>(rawParts.size());

        for (Object raw : rawParts) {
            if (!(raw instanceof Map<?, ?> part)) {
                continue;
            }

            Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) part);

            if (part.get("functionResponse") instanceof Map<?, ?> functionResponse
                    && functionResponse.get("response") instanceof Map<?, ?> response
                    && response.get("text") instanceof String text
                    && text.length() > SHRINK_ABOVE_CHARS) {

                Map<String, Object> newResponse = new LinkedHashMap<>((Map<String, Object>) response);
                newResponse.put("text", SHRUNK);

                Map<String, Object> newFunctionResponse = new LinkedHashMap<>((Map<String, Object>) functionResponse);
                newFunctionResponse.put("response", newResponse);

                copy.put("functionResponse", newFunctionResponse);
                changed = true;
            }

            parts.add(copy);
        }

        if (!changed) {
            return turn;
        }

        Map<String, Object> result = new LinkedHashMap<>(turn);
        result.put("parts", parts);
        return result;
    }

    private void evictExpired(long now) {
        boolean removed = sessions.entrySet()
                .removeIf(entry -> now - entry.getValue().lastUsed().get() > ttlMillis);
        if (removed) {
            log.debug("Dropped expired chat sessions");
        }
    }

    private void evictOldest(int count) {
        sessions.entrySet().stream()
                .sorted((a, b) -> Long.compare(a.getValue().lastUsed().get(), b.getValue().lastUsed().get()))
                .limit(count)
                .map(Map.Entry::getKey)
                .toList()
                .forEach(sessions::remove);
        log.debug("Dropped {} oldest chat session(s)", count);
    }
}
