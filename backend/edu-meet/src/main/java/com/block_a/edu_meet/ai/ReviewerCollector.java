package com.block_a.edu_meet.ai;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Component;

// Holds the reviewer the model submitted during the request being handled.
// The controller reads it after the tool loop and returns it as the reply, so
// the items arrive as validated structure instead of a JSON-shaped sentence.
@Component
public class ReviewerCollector {

    public record Result(String note, List<Map<String, String>> items) {}

    private final ThreadLocal<Result> current = new ThreadLocal<>();

    public void add(String note, List<Map<String, String>> items) {
        Result existing = current.get();
        Map<String, Map<String, String>> merged = new LinkedHashMap<>();

        // The model may submit in several calls (or repeat itself); merge by
        // term so batching never loses items and repeats never duplicate them.
        if (existing != null) {
            for (Map<String, String> item : existing.items()) {
                merged.putIfAbsent(keyOf(item), item);
            }
        }
        for (Map<String, String> item : items) {
            merged.putIfAbsent(keyOf(item), item);
        }

        String combinedNote = note == null || note.isBlank()
                ? (existing == null ? null : existing.note())
                : note;

        current.set(new Result(combinedNote, List.copyOf(merged.values())));
    }

    private static String keyOf(Map<String, String> item) {
        return item.getOrDefault("answer", "").toLowerCase(Locale.ROOT).trim();
    }

    public Result get() {
        return current.get();
    }

    public void clear() {
        current.remove();
    }
}
