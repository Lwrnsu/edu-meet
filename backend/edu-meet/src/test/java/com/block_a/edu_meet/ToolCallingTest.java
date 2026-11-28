package com.block_a.edu_meet;

import com.block_a.edu_meet.ai.ChatPrompt;
import com.block_a.edu_meet.ai.GeminiChatService;
import com.block_a.edu_meet.ai.KnowledgeBase;
import com.block_a.edu_meet.ai.SourceCollector;
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
                new SearchKnowledgeBaseTool(new KnowledgeBase(), new SourceCollector()),
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
    void promptDescribesEduBotCapabilities() {
        assertTrue(ChatPrompt.SYSTEM.contains("Your name is EduBOT"));
        assertTrue(ChatPrompt.SYSTEM.contains("reviewer or flashcards"));
        assertTrue(ChatPrompt.SYSTEM.contains(
                "Do not call searchKnowledgeBase for questions about yourself"));
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
    void knowledgeBaseExplainsPasswordResetAndSignInLimits() {
        KnowledgeBase knowledgeBase = new KnowledgeBase();

        var reset = knowledgeBase.search("wrong OTP 5 times").getFirst();
        assertEquals("Resetting a password", reset.title());
        assertTrue(reset.text().contains("10 minutes"));
        assertTrue(knowledgeBase.search("too many OTP requests in an hour")
                .getFirst().text().contains("1-hour"));

        var lockout = knowledgeBase.search("wrong password 5 times locked out").getFirst();
        assertEquals("Too many failed sign-in attempts", lockout.title());
        assertTrue(lockout.text().contains("15 minutes"));
    }

    @Test
    void serviceCallsTheToolThenReturnsTheFinalAnswer() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ToolRegistry registry = new ToolRegistry(List.of(
                new SearchKnowledgeBaseTool(new KnowledgeBase(), new SourceCollector())
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

    @Test
    void leakedReasoningIsRetriedAndReplacedWithTheCleanAnswer() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ToolRegistry registry = new ToolRegistry(List.of(
                new SearchKnowledgeBaseTool(new KnowledgeBase(), new SourceCollector())
        ));

        server.expect(requestTo(containsString(":generateContent")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"role":"model","parts":[
                          {"text":"The user asked for a list. Wait, let me check the instructions.\\nMitochondria"}
                        ]},"finishReason":"STOP"}]}
                        """, MediaType.APPLICATION_JSON));

        server.expect(requestTo(containsString(":generateContent")))
                .andExpect(content().string(containsString("Do not explain")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"role":"model","parts":[
                          {"text":"Mitochondria, Jillian Carl M. Pascasio, Marlon"}
                        ]},"finishReason":"STOP"}]}
                        """, MediaType.APPLICATION_JSON));

        GeminiChatService service = new GeminiChatService(
                builder.build(), registry, "test-key", "gemini-test");

        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", "List the important things in this pdf"))));

        assertEquals("Mitochondria, Jillian Carl M. Pascasio, Marlon", service.chat(contents));
        server.verify();

        // user turn + the clean model turn; the leaked one was replaced
        assertEquals(2, contents.size());
    }

    @Test
    void leakedReasoningIsStrippedWhenTheRetryAlsoLeaks() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ToolRegistry registry = new ToolRegistry(List.of(
                new SearchKnowledgeBaseTool(new KnowledgeBase(), new SourceCollector())
        ));

        server.expect(requestTo(containsString(":generateContent")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"role":"model","parts":[
                          {"text":"The user asked for a list.\\nWait, let me check the instructions.\\nMitochondria"}
                        ]},"finishReason":"STOP"}]}
                        """, MediaType.APPLICATION_JSON));

        server.expect(requestTo(containsString(":generateContent")))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"role":"model","parts":[
                          {"text":"Let me think about the system prompt.\\nMitochondria, Marlon"}
                        ]},"finishReason":"STOP"}]}
                        """, MediaType.APPLICATION_JSON));

        GeminiChatService service = new GeminiChatService(
                builder.build(), registry, "test-key", "gemini-test");

        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", "List the important things in this pdf"))));

        String reply = service.chat(contents);
        String lower = reply.toLowerCase();

        assertFalse(lower.contains("wait,"));
        assertFalse(lower.contains("instructions"));
        assertFalse(lower.contains("system prompt"));
        assertTrue(reply.contains("Mitochondria"));
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
