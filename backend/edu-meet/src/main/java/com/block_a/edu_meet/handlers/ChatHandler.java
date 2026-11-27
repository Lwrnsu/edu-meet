package com.block_a.edu_meet.handlers;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.MessageRepository;

import tools.jackson.databind.ObjectMapper;
import com.block_a.edu_meet.services.RecentMessageCache;
import com.block_a.edu_meet.services.ChatSocketTickets;
import com.block_a.edu_meet.security.PhpChatAccount;
import com.block_a.edu_meet.exception.ApiException;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatHandler.class);

    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByUser =
            new ConcurrentHashMap<>();

        private final ObjectMapper objectMapper;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final RecentMessageCache recentMessageCache;
    private final ChatSocketTickets tickets;
    private final MemberLookup memberLookup;

    public ChatHandler(ObjectMapper objectMapper, MessageRepository messageRepository,
                       ConversationRepository conversationRepository,
                       RecentMessageCache recentMessageCache, ChatSocketTickets tickets, MemberLookup memberLookup) {
        this.objectMapper = objectMapper;
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.recentMessageCache = recentMessageCache;
        this.tickets = tickets;
        this.memberLookup = memberLookup;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String ticket = UriComponentsBuilder.fromUri(session.getUri())
                .build().getQueryParams().getFirst("ticket");
        var identity = tickets.redeem(ticket);
        if (identity == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        String userId = identity.userId();
        session.getAttributes().put("userId", userId);
        session.getAttributes().put("chatAccount", identity);
        sessionsByUser.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
        System.out.println("Connected: " + userId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null) {
            Set<WebSocketSession> userSessions = sessionsByUser.get(userId);
            if (userSessions != null) {
                userSessions.remove(session);
            }
            System.out.println("Disconnected: " + userId);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        if (!hasValidSession(session)) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        String userId = (String) session.getAttributes().get("userId");

        Message incoming;
        try {
            incoming = objectMapper.readValue(message.getPayload(), Message.class);
        } catch (Exception e) {
            return;
        }

        if (incoming.getConversationId() == null || incoming.getText() == null
                || incoming.getText().isBlank() || incoming.getText().length() > 2000) {
            return;
        }

        incoming.setSenderId(userId);
        incoming.setId(null);
        incoming.setAttachment(null);
        incoming.setAttachmentBytes(null);

        Conversation conversation = conversationRepository
                .findById(incoming.getConversationId()).orElse(null);
        if (conversation == null || !conversation.getParticipantIds().contains(userId)) {
            return;
        }

        incoming.setTimestamp(Instant.now());
        Message saved;
        try {
            saved = messageRepository.save(incoming);
        } catch (DataAccessException exception) {
            log.warn("Failed to save a message in conversation {}", incoming.getConversationId(), exception);
            send(session, new TextMessage(objectMapper.writeValueAsString(Map.of(
                    "type", "message_error",
                    "code", "MESSAGE_SAVE_FAILED",
                    "conversationId", incoming.getConversationId(),
                    "message", "Could not save the message. Please try again."
            ))));
            return;
        }
        publishSavedMessage(conversation, saved);
    }

    public void publishSavedMessage(Conversation conversation, Message saved) {
        recentMessageCache.invalidate(saved.getConversationId());

        String senderName = null;
        try {
            var members = memberLookup.findMembers(List.of(saved.getSenderId()));
            if (!members.isEmpty()) senderName = members.getFirst().fullName();
        } catch (DataAccessException exception) {
            log.warn("Could not resolve the sender name for message {}", saved.getId(), exception);
        }
        var event = new SavedMessage(saved.getId(), saved.getConversationId(), saved.getSenderId(),
                saved.getText(), saved.getTimestamp(), saved.getAttachment(), senderName);
        broadcast(conversation, event);
    }

    public void publishPinsChanged(Conversation conversation) {
        broadcast(conversation, Map.of("type", "pins_changed", "conversationId", conversation.getId()));
    }

    public void publishMessageUnsent(Conversation conversation, String messageId) {
        recentMessageCache.invalidate(conversation.getId());
        broadcast(conversation, Map.of("type", "message_unsent",
                "conversationId", conversation.getId(), "messageId", messageId));
    }

    private void broadcast(Conversation conversation, Object event) {
        TextMessage out = new TextMessage(objectMapper.writeValueAsString(event));
        for (String memberId : conversation.getParticipantIds()) {
            Set<WebSocketSession> memberSessions = sessionsByUser.get(memberId);
            if (memberSessions == null) continue;
            for (WebSocketSession s : memberSessions) {
                                try {
                    send(s, out);
                } catch (Exception e) {
                    System.out.println("Failed to send to a connection: " + e.getMessage());
                }
            }
        }
    }

    private record SavedMessage(String id, String conversationId, String senderId, String text,
                                Instant timestamp, Message.Attachment attachment, String senderName) {}

    private boolean hasValidSession(WebSocketSession session) {
        if (!(session.getAttributes().get("chatAccount") instanceof PhpChatAccount account)) return false;
        try {
            return account.equals(PhpChatAccount.fromSession(account.sessionToken()));
        } catch (ApiException exception) {
            log.warn("Could not verify the PHP chat session");
            return false;
        }
    }

    private void send(WebSocketSession session, TextMessage message) throws IOException {
        // The underlying WebSocket session only supports one write at a time.
        synchronized (session) {
            if (!session.isOpen()) return;
            if (hasValidSession(session)) {
                session.sendMessage(message);
            } else {
                session.close(CloseStatus.POLICY_VIOLATION);
            }
        }
    }
}
