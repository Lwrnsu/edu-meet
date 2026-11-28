package com.block_a.edu_meet.ai;

import com.block_a.edu_meet.ai.tools.SearchKnowledgeBaseTool;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatControllerTest {

    private final PdfAttachment attachment = new PdfAttachment();
    private final ReviewerCollector reviewer = new ReviewerCollector();
    private final SourceCollector sources = new SourceCollector();

    @Test
    void rejectsBlankSessionId() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> controller(mock(GeminiChatService.class)).chat(new ChatController.ChatRequest("  ", "hi")));

        assertEquals(400, e.getStatusCode().value());
    }

    @Test
    void rejectsOverlongMessages() {
        String tooLong = "x".repeat(51);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> controller(mock(GeminiChatService.class)).chat(new ChatController.ChatRequest("s1", tooLong)));

        assertEquals(400, e.getStatusCode().value());
        assertTrue(e.getReason().contains("50"));
    }

    // A failed turn used to stay in the history, so every later request in the
    // session failed as well.
    @Test
    void rollsBackTheTurnWhenTheModelFails() {
        GeminiChatService gemini = mock(GeminiChatService.class);
        when(gemini.chat(any()))
                .thenThrow(new GeminiChatService.ModelResponseException("boom"))
                .thenReturn("second time is fine");

        ChatController controller = controller(gemini);
        assertThrows(GeminiChatService.ModelResponseException.class,
                () -> controller.chat(new ChatController.ChatRequest("s1", "hi")));
        assertEquals("second time is fine",
                controller.chat(new ChatController.ChatRequest("s1", "hi again")).reply());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Map<String, Object>>> sent = ArgumentCaptor.forClass(List.class);
        verify(gemini, times(2)).chat(sent.capture());

        // The failed exchange was rolled back, so only the new turn is sent.
        assertEquals(1, sent.getValue().size());
    }

    @Test
    void multipartNeverPutsTheServerPathInThePromptAndReleasesTheFile() {
        GeminiChatService gemini = mock(GeminiChatService.class);
        when(gemini.chat(any())).thenReturn("Reviewer ready");

        MockMultipartFile file = new MockMultipartFile(
                "file", "lecture.pdf", "application/pdf",
                "%PDF-1.4 test".getBytes(StandardCharsets.UTF_8));

        ChatController.ChatResponse response =
                controller(gemini).chat("mp-1", "make a reviewer", List.of(file));

        assertEquals("Reviewer ready", response.reply());
        assertTrue(attachment.get().isEmpty(), "the attachment must be cleared after the request");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Map<String, Object>>> sent = ArgumentCaptor.forClass(List.class);
        verify(gemini).chat(sent.capture());

        String promptText = textOf(sent.getValue().getFirst());
        assertTrue(promptText.contains("attached one PDF"));
        assertFalse(promptText.contains("edu-meet-pdf-"), "the temp path must not leak into the prompt");
    }

    // The reviewer arrives through the tool as structure, so the reply is built
    // here instead of trusting the model to print valid JSON.
    @Test
    void reviewerSubmittedByTheToolBecomesTheReply() {
        GeminiChatService gemini = mock(GeminiChatService.class);
        when(gemini.chat(any())).thenAnswer(invocation -> {
            reviewer.add("I only read the first 40 pages.",
                    List.of(Map.of("answer", "Mitochondria", "question", "Powerhouse of the Cell")));
            return "Here is your reviewer.";
        });

        String reply = controller(gemini)
                .chat(new ChatController.ChatRequest("r1", "make a reviewer"))
                .reply();

        assertTrue(reply.startsWith("I only read the first 40 pages."));
        assertTrue(reply.contains("\"answer\":\"Mitochondria\""));
        assertTrue(reply.contains("\"question\":\"Powerhouse of the Cell\""));
        assertNull(reviewer.get(), "the collector must be cleared after the request");
    }

    @Test
    void plainAnswersArePassedThroughUnchanged() {
        GeminiChatService gemini = mock(GeminiChatService.class);
        when(gemini.chat(any())).thenReturn("Hello! How can I help?");

        assertEquals("Hello! How can I help?",
                controller(gemini).chat(new ChatController.ChatRequest("p1", "hello")).reply());
    }

    // The articles the tool actually used are reported to the UI as sources.
    @Test
    void knowledgeBaseArticlesAreReportedAsSources() {
        GeminiChatService gemini = mock(GeminiChatService.class);
        SearchKnowledgeBaseTool kb = new SearchKnowledgeBaseTool(new KnowledgeBase(), sources);

        when(gemini.chat(any())).thenAnswer(invocation -> {
            kb.execute(Map.of("query", "reset password"));
            return "The reset link is valid for 60 minutes.";
        });

        ChatController.ChatResponse response =
                controller(gemini).chat(new ChatController.ChatRequest("s-src", "how do I reset my password?"));

        assertEquals(List.of("Resetting a password", "Too many failed sign-in attempts"),
                response.sources());
        assertEquals(List.of(), sources.get(), "sources must be cleared after the request");
    }

    @Test
    void requestsWithoutAKnowledgeBaseLookupHaveNoSources() {
        GeminiChatService gemini = mock(GeminiChatService.class);
        when(gemini.chat(any())).thenReturn("Hi there!");

        assertEquals(List.of(),
                controller(gemini).chat(new ChatController.ChatRequest("s-none", "hi")).sources());
    }

    @Test
    void rejectsMoreThanFiveFiles() {
        List<MultipartFile> files = java.util.stream.IntStream.rangeClosed(1, 6)
                .mapToObj(i -> (MultipartFile) new MockMultipartFile(
                        "file", "f" + i + ".pdf", "application/pdf",
                        "%PDF-1.4".getBytes(StandardCharsets.UTF_8)))
                .toList();

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> controller(mock(GeminiChatService.class)).chat("mp-6", "summarize", files));

        assertEquals(413, e.getStatusCode().value());
        assertTrue(e.getReason().contains("5"));
    }

    @SuppressWarnings("unchecked")
    private static String textOf(Map<String, Object> turn) {
        List<Map<String, Object>> parts = (List<Map<String, Object>>) turn.get("parts");
        return (String) parts.getFirst().get("text");
    }

    private ChatController controller(GeminiChatService gemini) {
        return new ChatController(
                gemini,
                new ChatSessionStore(10, 12, 60),
                attachment,
                reviewer,
                sources,
                new ObjectMapper(),
                50,
                1024,
                5);
    }
}
