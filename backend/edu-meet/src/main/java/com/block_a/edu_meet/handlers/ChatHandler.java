package com.block_a.edu_meet.handlers;

import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.MessageRepository;

import tools.jackson.databind.ObjectMapper;
import com.block_a.edu_meet.services.RecentMessageCache;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByUser =
            new ConcurrentHashMap<>();

        private final ObjectMapper objectMapper;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final RecentMessageCache recentMessageCache;

    public ChatHandler(ObjectMapper objectMapper, MessageRepository messageRepository,
                       ConversationRepository conversationRepository,
                       RecentMessageCache recentMessageCache) {
        this.objectMapper = objectMapper;
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.recentMessageCache = recentMessageCache;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userId = UriComponentsBuilder.fromUri(session.getUri())
                .build().getQueryParams().getFirst("userId");

        if (userId == null || userId.isBlank()) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        session.getAttributes().put("userId", userId);
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
                incoming.setId(null);

        Conversation conversation = conversationRepository
                .findById(incoming.getConversationId()).orElse(null);
        if (conversation == null || !conversation.getParticipantIds().contains(userId)) {
            return;
        }

        incoming.setTimestamp(Instant.now());
        Message saved = messageRepository.save(incoming);
        System.out.println("Saved: " + saved.getId());
        recentMessageCache.invalidate(saved.getConversationId());

        TextMessage out = new TextMessage(objectMapper.writeValueAsString(saved));
        for (String memberId : conversation.getParticipantIds()) {
            Set<WebSocketSession> memberSessions = sessionsByUser.get(memberId);
            if (memberSessions == null) continue;
            for (WebSocketSession s : memberSessions) {
                                try {
                    if (s.isOpen()) {
                        s.sendMessage(out);
                    }
                } catch (Exception e) {
                    System.out.println("Failed to send to a connection: " + e.getMessage());
                }
            }
        }
    }
}
