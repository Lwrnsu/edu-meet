package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.block_a.edu_meet.dtos.MemberDto;
import com.block_a.edu_meet.handlers.ChatHandler;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.security.PhpChatAccount;
import com.block_a.edu_meet.services.ChatSocketTickets;
import com.block_a.edu_meet.services.RecentMessageCache;

import tools.jackson.databind.ObjectMapper;

class SavedMessagePreviewTest {
    @Test
    void broadcastsAttachmentMetadataAndVerifiedNameWithoutBytes() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        MemberLookup members = mock(MemberLookup.class);
        ChatSocketTickets tickets = mock(ChatSocketTickets.class);
        var handler = new ChatHandler(mapper, mock(MessageRepository.class), mock(ConversationRepository.class),
                mock(RecentMessageCache.class), tickets, members);
        var account = new PhpChatAccount(42, "session");
        when(tickets.redeem("ticket")).thenReturn(account);
        when(members.findMembers(List.of(account.userId())))
                .thenReturn(List.of(new MemberDto(account.userId(), "Alex Rivera", null, null)));
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getUri()).thenReturn(URI.create("ws://localhost/chat?ticket=ticket"));
        when(session.getAttributes()).thenReturn(new HashMap<>());
        when(session.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(session);

        var conversation = new Conversation(ConversationType.BLOCK, "Class", List.of(account.userId()));
        var message = new Message("chat", account.userId(), "", Instant.parse("2026-11-27T05:00:00Z"));
        message.setId("message");
        message.setAttachment(new Message.Attachment("photo.png", "image/png", 1));
        message.setAttachmentBytes(new byte[] {1});

        try (var accounts = mockStatic(PhpChatAccount.class)) {
            accounts.when(() -> PhpChatAccount.fromSession("session")).thenReturn(account);
            handler.publishSavedMessage(conversation, message);
        }

        var sent = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(sent.capture());
        var json = mapper.readTree(sent.getValue().getPayload());
        assertEquals("message", json.path("id").asText());
        assertEquals("chat", json.path("conversationId").asText());
        assertEquals(account.userId(), json.path("senderId").asText());
        assertEquals("Alex Rivera", json.path("senderName").asText());
        assertEquals("image/png", json.path("attachment").path("contentType").asText());
        assertFalse(json.has("attachmentBytes"));
    }
}
