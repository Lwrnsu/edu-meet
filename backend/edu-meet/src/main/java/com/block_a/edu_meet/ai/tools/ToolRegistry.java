package com.block_a.edu_meet.ai.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Collects every Tool bean and exposes them to Gemini as function declarations.
@Component
public class ToolRegistry {

    private static final Logger log = LoggerFactory.getLogger(ToolRegistry.class);

    private final Map<String, Tool> tools;

    public ToolRegistry(List<Tool> discovered) {
        this.tools = discovered.stream()
                .collect(Collectors.toUnmodifiableMap(Tool::name, Function.identity()));
        log.info("Registered {} tool(s): {}", tools.size(), tools.keySet());
    }

    // The functionDeclarations array. Gemini rejects an empty parameters
    // object, so we leave it out for tools that take no arguments.
    public List<Map<String, Object>> declarations() {
        return tools.values().stream().map(ToolRegistry::declaration).toList();
    }

    private static Map<String, Object> declaration(Tool tool) {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("name", tool.name());
        function.put("description", tool.description());
        if (!tool.parameters().isEmpty()) {
            function.put("parameters", tool.parameters());
        }
        return function;
    }

    // Runs a tool the model asked for. Never throws: a failure comes back as
    // {"error": ...} so the model can explain it instead of a 500.
    public Map<String, Object> invoke(String name, Map<String, Object> arguments) {
        Tool tool = tools.get(name);

        if (tool == null) {
            log.warn("Model requested an unknown tool: {}", name);
            return Map.of("error", "Unknown tool: " + name);
        }

        try {
            Map<String, Object> result = tool.execute(arguments == null ? Map.of() : arguments);
            return result == null ? Map.of() : result;
        } catch (Exception e) {
            log.error("Tool '{}' failed with arguments {}", name, arguments, e);
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return Map.of("error", message);
        }
    }
}
