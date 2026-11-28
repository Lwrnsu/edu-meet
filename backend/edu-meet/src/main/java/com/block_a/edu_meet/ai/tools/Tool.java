package com.block_a.edu_meet.ai.tools;

import java.util.Map;

// A capability the model can call. Add a new one by implementing this and
// marking the class @Component; ToolRegistry picks it up automatically.
public interface Tool {

    // Name the model calls, e.g. "searchKnowledgeBase".
    String name();

    // Describe *when* to use it, not just what it does - this is what the
    // model reads to decide whether to call the tool.
    String description();

    // Gemini-style argument schema (uppercase types). Empty map if it takes none.
    Map<String, Object> parameters();

    // Return a JSON-serialisable map. Prefer an "error" key over throwing so
    // the model can explain the problem instead of failing the request.
    Map<String, Object> execute(Map<String, Object> arguments);
}
