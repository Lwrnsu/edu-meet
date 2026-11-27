package com.block_a.edu_meet.ai.tools;

import org.springframework.stereotype.Component;

import com.block_a.edu_meet.ai.KnowledgeBase;

import java.util.List;
import java.util.Map;

// Lets the model look things up in the EduMeet help content instead of guessing.
@Component
public class SearchKnowledgeBaseTool implements Tool {

    private final KnowledgeBase knowledgeBase;

    public SearchKnowledgeBaseTool(KnowledgeBase knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
    }

    @Override
    public String name() {
        return "searchKnowledgeBase";
    }

    @Override
    public String description() {
        return "Search the EduMeet help centre for product information: accounts and roles, "
                + "scheduling and joining meetings, recordings, supported languages, browsers "
                + "and devices, and troubleshooting. Use this for any question about EduMeet "
                + "features or policies, and base the answer only on what it returns.";
    }

    @Override
    public Map<String, Object> parameters() {
        return Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "query", Map.of(
                                "type", "STRING",
                                "description", "Short search phrase, e.g. 'reset password' or "
                                        + "'join a meeting late'."
                        )
                ),
                "required", List.of("query")
        );
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> arguments) {
        String query = String.valueOf(arguments.getOrDefault("query", ""));
        List<KnowledgeBase.Entry> results = knowledgeBase.search(query);

        if (results.isEmpty()) {
            return Map.of(
                    "results", List.of(),
                    "note", "No matching article. Tell the user you don't have that information "
                            + "in the help centre and suggest contacting their school administrator. "
                            + "Do not guess and do not answer from general knowledge."
            );
        }

        return Map.of("results", results.stream()
                .map(entry -> Map.of("title", entry.title(), "text", entry.text()))
                .toList());
    }
}