package com.block_a.edu_meet.chat;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.block_a.edu_meet.controllers.CommunicationApiResponseAdvice;
import com.block_a.edu_meet.controllers.ConversationController;
import com.block_a.edu_meet.controllers.MessageController;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.dtos.MemberDto;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.RecentMessageCache;
import com.block_a.edu_meet.services.ConversationCreationService;

class ConversationReadAccessTest {

    private static final String NOT_FOUND_RESPONSE = """
            {"response":false,"code":404,"message":"Conversation doesn't exist","body":null}
            """;

    private ConversationRepository conversations;
    private MessageRepository messages;
    private MemberLookup members;
    private RecentMessageCache cache;
    private Conversation conversation;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        conversations = mock(ConversationRepository.class);
        messages = mock(MessageRepository.class);
        members = mock(MemberLookup.class);
        cache = mock(RecentMessageCache.class);
        conversation = new Conversation(ConversationType.BLOCK, "Test block", List.of("member"));
        when(conversations.findById("chat")).thenReturn(Optional.of(conversation));

        ConversationAccess access = new ConversationAccess(conversations);
        mvc = MockMvcBuilders.standaloneSetup(
                new MessageController(messages, access, cache),
                new ConversationController(conversations, members, messages, access,
                        new ConversationCreationService(conversations)))
                .setControllerAdvice(new CommunicationApiResponseAdvice())
                .build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void membersCanRead(String endpoint) throws Exception {
        Message message = new Message("chat", "member", "Hello", Instant.parse("2026-11-15T00:00:00Z"));
        message.setId("cursor");
        when(messages.findById("cursor")).thenReturn(Optional.of(message));
        when(messages.findByConversationIdOrderByTimestampDescIdDesc(eq("chat"), any()))
                .thenReturn(List.of(message));
        when(messages.findOlderMessages(eq("chat"), any(), eq("cursor"), any()))
                .thenReturn(List.of(message));
        when(members.findMembers(List.of("member")))
                .thenReturn(List.of(new MemberDto("member", "Test member", "2024-00001", null)));

        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", "member").param("beforeId", "cursor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response").value(true))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("OK"))
                .andExpect(jsonPath(endpoint.equals("/members") ? "$.body[0].fullName" : "$.body[0].text")
                        .value(endpoint.equals("/members") ? "Test member" : "Hello"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void outsidersSeeNotFound(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", "outsider").param("beforeId", "cursor"))
                .andExpect(status().isNotFound())
                .andExpect(content().json(NOT_FOUND_RESPONSE, JsonCompareMode.STRICT));
        verifyNoInteractions(messages, members, cache);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void missingUserIdIsRejected(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("beforeId", "cursor"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.response").value(false))
                .andExpect(jsonPath("$.code").value(400));
        verifyNoInteractions(conversations, messages, members, cache);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void blankUserIdIsRejected(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", " ").param("beforeId", "cursor"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(messages, members, cache);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void missingConversationReturnsNotFound(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/missing" + endpoint)
                .param("userId", "member").param("beforeId", "cursor"))
                .andExpect(status().isNotFound())
                .andExpect(content().json(NOT_FOUND_RESPONSE, JsonCompareMode.STRICT));
        verifyNoInteractions(messages, members, cache);
    }

    @Test
    void creatingAnExistingPrivateChatReturnsItInTheResponseBody() throws Exception {
        Conversation existing = new Conversation(ConversationType.PRIVATE, null, List.of("member", "other"));
        existing.setId("existing");
        when(conversations.findByTypeAndParticipantIdsContaining(ConversationType.PRIVATE, "member"))
                .thenReturn(List.of(existing));

        mvc.perform(post("/api/conversations").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"type":"PRIVATE","participantIds":["member","other"]}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response").value(true))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.body.id").value("existing"));
    }

    @Test
    void malformedConversationRequestReturnsAnErrorResponse() throws Exception {
        mvc.perform(post("/api/conversations").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.response").value(false))
                .andExpect(jsonPath("$.code").value(400));
        verifyNoInteractions(conversations);
    }

    @Test
    void olderMessagesRequireACursor() throws Exception {
        mvc.perform(get("/api/conversations/chat/messages/older").param("userId", "member"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(messages);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "missing"})
    void invalidCursorsAreRejected(String beforeId) throws Exception {
        mvc.perform(get("/api/conversations/chat/messages/older")
                .param("userId", "member").param("beforeId", beforeId))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cursorFromAnotherChatIsRejected() throws Exception {
        when(messages.findById("foreign")).thenReturn(Optional.of(
                new Message("other-chat", "member", "Other chat", Instant.now())));
        mvc.perform(get("/api/conversations/chat/messages/older")
                .param("userId", "member").param("beforeId", "foreign"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void removedMemberCannotReadHistory() throws Exception {
        mvc.perform(get("/api/conversations/chat/messages").param("userId", "member"))
                .andExpect(status().isOk());

        conversation.setParticipantIds(List.of("someone-else"));
        clearInvocations(messages, cache);
        mvc.perform(get("/api/conversations/chat/messages").param("userId", "member"))
                .andExpect(status().isNotFound())
                .andExpect(content().json(NOT_FOUND_RESPONSE, JsonCompareMode.STRICT));
        verifyNoInteractions(messages, members, cache);
    }
}
