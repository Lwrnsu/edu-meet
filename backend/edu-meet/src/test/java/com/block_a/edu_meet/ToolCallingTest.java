package com.block_a.edu_meet;

import com.block_a.edu_meet.ai.GeminiChatService;
import com.block_a.edu_meet.ai.KnowledgeBase;
import com.block_a.edu_meet.ai.tools.SearchKnowledgeBaseTool;
import com.block_a.edu_meet.ai.tools.Tool;
import com.block_a.edu_meet.ai.tools.ToolRegistry;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ToolCallingTest {

    @Test
    void declarationsUseGeminiShapeAndOmitEmptyParameters() {
        ToolRegistry registry = new ToolRegistry(List.of(
                new SearchKnowledgeBaseTool(new KnowledgeBase()),
                pingTool()
        ));

        List<Map<String, Object>> declarations = registry.declarations();
        assertEquals(2, declarations.size());

        Map<String, Object> search = byName(declarations, "searchKnowledgeBase");
        assertEquals("OBJECT", ((Map<?, ?>) search.get("parameters")).get("type"));

        Map<String, Object> ping = byName(declarations, "ping");
        assertFalse(ping.containsKey("parameters"), "no-arg tools must omit parameters");
    }

    @Test
    void toolFailuresComeBackAsAnErrorPayload() {
        ToolRegistry registry = new ToolRegistry(List.of(pingTool(), boomTool()));

        assertEquals("Unknown tool: nope", registry.invoke("nope", Map.of()).get("error"));
        assertTrue(registry.invoke("boom", Map.of()).get("error").toString().contains("kaput"));
    }

    @Test
    void knowledgeBaseFindsRelevantArticles() {
        KnowledgeBase knowledgeBase = new KnowledgeBase();

        var results = knowledgeBase.search("I forgot my password");
        assertFalse(results.isEmpty());
        assertEquals("Resetting a password", results.getFirst().title());

        assertTrue(knowledgeBase.search("quantum chromodynamics").isEmpty());
    }

    @Test
    void serviceCallsTheToolThenReturnsTheFinalAnswer() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ToolRegistry registry = new ToolRegistry(List.of(
                new SearchKnowledgeBaseTool(new KnowledgeBase())
        ));

        // Turn 1: the model asks for the knowledge base.
        server.expect(requestTo(containsString(":generateContent")))
                .andExpect(content().string(containsString("\"functionDeclarations\"")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"role":"model","parts":[
                          {"functionCall":{"name":"searchKnowledgeBase","args":{"query":"password reset"}}}
                        ]},"finishReason":"STOP"}]}
                        """, MediaType.APPLICATION_JSON));

        // Turn 2: it must be sent the article, then answers in text.
        server.expect(requestTo(containsString(":generateContent")))
                .andExpect(content().string(containsString("\"functionResponse\"")))
                .andExpect(content().string(containsString("60 minutes")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"role":"model","parts":[
                          {"text":"The reset link is valid for 60 minutes."}
                        ]},"finishReason":"STOP"}]}
                        """, MediaType.APPLICATION_JSON));

        GeminiChatService service = new GeminiChatService(
                builder.build(), registry, "test-key", "gemini-test");

        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", "How long is the password link valid?"))));

        assertEquals("The reset link is valid for 60 minutes.", service.chat(contents));
        server.verify();

        // user -> model(functionCall) -> user(functionResponse) -> model(text)
        assertEquals(4, contents.size());
        assertEquals("model", contents.get(1).get("role"));
        assertEquals("user", contents.get(2).get("role"));
    }

    private static Map<String, Object> byName(List<Map<String, Object>> declarations, String name) {
        return declarations.stream()
                .filter(declaration -> name.equals(declaration.get("name")))
                .findFirst()
                .orElseThrow();
    }

    private static Tool pingTool() {
        return new Tool() {
            @Override public String name() { return "ping"; }
            @Override public String description() { return "Test tool with no arguments."; }
            @Override public Map<String, Object> parameters() { return Map.of(); }
            @Override public Map<String, Object> execute(Map<String, Object> arguments) {
                return Map.of("ok", true);
            }
        };
    }

    private static Tool boomTool() {
        return new Tool() {
            @Override public String name() { return "boom"; }
            @Override public String description() { return "Test tool that always fails."; }
            @Override public Map<String, Object> parameters() { return Map.of(); }
            @Override public Map<String, Object> execute(Map<String, Object> arguments) {
                throw new IllegalStateException("kaput");
            }
        };
    }
}
