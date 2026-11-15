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
import java.util.Collections;
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
    private RecentMessageCache cache;
    private MemberLookup members;
    private Conversation conversation;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        conversations = mock(ConversationRepository.class);
        messages = mock(MessageRepository.class);
        cache = mock(RecentMessageCache.class);
        members = mock(MemberLookup.class);
        conversation = new Conversation(ConversationType.BLOCK, "Test block", List.of("member"));
        when(conversations.findById("chat")).thenReturn(Optional.of(conversation));

        ConversationAccess access = new ConversationAccess(conversations);
        mvc = MockMvcBuilders.standaloneSetup(
                new MessageController(messages, cache, access),
                new ConversationController(conversations, members, messages, access)).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void membersCanRead(String endpoint) throws Exception {
        Message message = new Message("chat", "member", "Hello", Instant.parse("2026-11-15T00:00:00Z"));
        when(cache.getLatest("chat", 20)).thenReturn(List.of());
        when(messages.findByConversationIdOrderByTimestampDesc(eq("chat"), any()))
                .thenReturn(List.of(message));
        when(messages.findByConversationIdAndTimestampBeforeOrderByTimestampDesc(eq("chat"), any(), any()))
                .thenReturn(List.of(message));
        when(members.findMembers(List.of("member")))
                .thenReturn(List.of(new MemberDto("member", "Test member", "2024-00001", null)));

        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", "member").param("before", "2026-11-16T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(
                        endpoint.equals("/members") ? "Test member" : "Hello")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void outsidersCannotRead(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", "outsider").param("before", "2026-11-16T00:00:00Z"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(cache, messages, members);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void missingUserIdIsRejected(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("before", "2026-11-16T00:00:00Z"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(conversations, cache, messages, members);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void blankUserIdIsRejected(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/chat" + endpoint)
                .param("userId", " ").param("before", "2026-11-16T00:00:00Z"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cache, messages, members);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/messages", "/messages/older", "/members"})
    void missingConversationReturnsNotFound(String endpoint) throws Exception {
        mvc.perform(get("/api/conversations/missing" + endpoint)
                .param("userId", "member").param("before", "2026-11-16T00:00:00Z"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(cache, messages, members);
    }

    @Test
    void removedMemberCannotReadEvenWhenMessagesAreCached() throws Exception {
        Message message = new Message("chat", "member", "Cached message", Instant.now());
        when(cache.getLatest("chat", 20)).thenReturn(Collections.nCopies(20, message));
        mvc.perform(get("/api/conversations/chat/messages").param("userId", "member"))
                .andExpect(status().isOk());

        conversation.setParticipantIds(List.of("someone-else"));
        clearInvocations(cache);
        mvc.perform(get("/api/conversations/chat/messages").param("userId", "member"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(cache, messages, members);
    }
}
