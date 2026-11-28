package com.block_a.edu_meet.ai.tools;

import com.block_a.edu_meet.ai.ReviewerCollector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// The model submits the finished reviewer here instead of printing JSON.
// Gemini validates the arguments against the schema below, so the items reach
// the backend as structure - no markdown fences, no truncated arrays.
@Component
public class SubmitReviewerTool implements Tool {

    private final ReviewerCollector collector;

    private static final Logger log = LoggerFactory.getLogger(SubmitReviewerTool.class);

    public SubmitReviewerTool(ReviewerCollector collector) {
        this.collector = collector;
    }

    @Override
    public String name() {
        return "submitReviewer";
    }

    @Override
    public String description() {
        return "Deliver the finished reviewer items to the user. Call this after reading a PDF "
                + "when the user asked for a reviewer or flashcards. Do not print the "
                + "items yourself - this tool shows them.";
    }

    @Override
    public Map<String, Object> parameters() {
        return Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "items", Map.of(
                                "type", "ARRAY",
                                "description", "The reviewer items, one per term.",
                                "items", Map.of(
                                        "type", "OBJECT",
                                        "properties", Map.of(
                                                "answer", Map.of(
                                                        "type", "STRING",
                                                        "description", "The term being defined"),
                                                "question", Map.of(
                                                        "type", "STRING",
                                                        "description", "The definition of that term, one sentence")),
                                        "required", List.of("answer", "question"))),
                        "note", Map.of(
                                "type", "STRING",
                                "description", "Optional one-sentence note, e.g. when only the first pages "
                                        + "of the PDF could be read")),
                "required", List.of("items"));
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> arguments) {
        if (!(arguments.get("items") instanceof List<?> rawItems) || rawItems.isEmpty()) {
            return Map.of("error", "No reviewer items were supplied.");
        }

        List<Map<String, String>> items = new ArrayList<>(rawItems.size());

        for (Object raw : rawItems) {
            if (!(raw instanceof Map<?, ?> item)) {
                continue;
            }
            String answer = text(item.get("answer"));
            String question = text(item.get("question"));
            if (!answer.isEmpty() && !question.isEmpty()) {
                // LinkedHashMap keeps "answer" before "question" in the JSON
                // the frontend downloads.
                Map<String, String> ordered = new LinkedHashMap<>();
                ordered.put("answer", answer);
                ordered.put("question", question);
                items.add(Collections.unmodifiableMap(ordered));
            }
        }

        if (items.isEmpty()) {
            return Map.of("error", "Every item needs both an answer (the term) and a question (its definition).");
        }

        collector.add(text(arguments.get("note")), items);
        log.info("submitReviewer stored {} item(s)", items.size());

        return Map.of("saved", items.size(), "message", "Reviewer delivered to the user.");
    }

    private static String text(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim();
    }
}
