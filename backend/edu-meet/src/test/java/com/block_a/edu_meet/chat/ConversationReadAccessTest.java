package com.block_a.edu_meet.chat;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ConversationReadAccessTest {

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
                new ConversationController(conversations, members, messages, access)).build();
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
                .andExpect(content().string(containsString(
                        endpoint.equals("/members") ? "Test member" : "Hello")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void outsidersCannotRead(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", "outsider").param("beforeId", "cursor"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(messages, members, cache);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void missingUserIdIsRejected(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("beforeId", "cursor"))
                .andExpect(status().isBadRequest());
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
                .andExpect(status().isNotFound());
        verifyNoInteractions(messages, members, cache);
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
                .andExpect(status().isForbidden());
        verifyNoInteractions(messages, members, cache);
    }
}
