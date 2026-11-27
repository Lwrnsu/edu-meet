package com.block_a.edu_meet.ai.tools;

import com.block_a.edu_meet.ai.ReviewerCollector;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SubmitReviewerToolTest {

    private final ReviewerCollector collector = new ReviewerCollector();
    private final SubmitReviewerTool tool = new SubmitReviewerTool(collector);

    @Test
    void storesTheValidatedItems() {
        Map<String, Object> result = tool.execute(Map.of(
                "items", List.of(
                        Map.of("answer", " Mitochondria ", "question", "Powerhouse of the Cell"),
                        Map.of("answer", "Marlon", "question", "Teacher of OOP")),
                "note", "I only read the first 40 pages."));

        assertEquals(2, result.get("saved"));

        ReviewerCollector.Result reviewed = collector.get();
        assertEquals(2, reviewed.items().size());
        assertEquals("Mitochondria", reviewed.items().getFirst().get("answer"));
        assertEquals("I only read the first 40 pages.", reviewed.note());
    }

    @Test
    void dropsItemsMissingATermOrDefinition() {
        tool.execute(Map.of("items", List.of(
                Map.of("answer", "Only term"),
                Map.of("question", "Only definition"),
                Map.of("answer", "Kept", "question", "Because it has both"))));

        assertEquals(1, collector.get().items().size());
    }

    @Test
    void rejectsAnEmptySubmission() {
        Map<String, Object> result = tool.execute(Map.of("items", List.of()));

        assertTrue(result.get("error").toString().contains("No reviewer items"));
        assertNull(collector.get());
    }

    @Test
    void repeatedSubmissionsAreMergedWithoutDuplicates() {
        tool.execute(Map.of("items", List.of(Map.of("answer", "A", "question", "1"))));
        tool.execute(Map.of("items", List.of(
                Map.of("answer", "A", "question", "1"),
                Map.of("answer", "B", "question", "2"))));

        assertEquals(2, collector.get().items().size());
        assertEquals("A", collector.get().items().getFirst().get("answer"));
    }

    @Test
    void itemsKeepAnswerBeforeQuestionInTheJson() {
        tool.execute(Map.of("items", List.of(Map.of("answer", "Term", "question", "Definition"))));

        String json = new ObjectMapper().writeValueAsString(collector.get().items());

        assertTrue(json.indexOf("\"answer\"") < json.indexOf("\"question\""));
    }

    @Test
    void clearingRemovesTheResult() {
        tool.execute(Map.of("items", List.of(Map.of("answer", "A", "question", "B"))));
        collector.clear();

        assertNull(collector.get());
    }

    @Test
    void declaresAnArraySchema() {
        Map<?, ?> parameters = tool.parameters();
        assertEquals("OBJECT", parameters.get("type"));

        Map<?, ?> properties = (Map<?, ?>) parameters.get("properties");
        Map<?, ?> items = (Map<?, ?>) properties.get("items");
        assertEquals("ARRAY", items.get("type"));

        Map<?, ?> item = (Map<?, ?>) items.get("items");
        assertEquals("OBJECT", item.get("type"));
        assertFalse(((Map<?, ?>) item.get("properties")).isEmpty());
    }
}
