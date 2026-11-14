package com.block_a.edu_meet;

import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.block_a.edu_meet.chat.Conversation;
import com.block_a.edu_meet.chat.ConversationRepository;
import com.block_a.edu_meet.chat.Message;
import com.block_a.edu_meet.chat.MessageRepository;

import tools.jackson.databind.ObjectMapper;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByUser =
            new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;

    public ChatHandler(ObjectMapper objectMapper, MessageRepository messageRepository,
                       ConversationRepository conversationRepository) {
        this.objectMapper = objectMapper;
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
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
        Message incoming = objectMapper.readValue(message.getPayload(), Message.class);
        incoming.setSenderId(userId);

        Conversation conversation = conversationRepository
                .findById(incoming.getConversationId()).orElse(null);
        if (conversation == null || !conversation.getParticipantIds().contains(userId)) {
            return;
        }

        incoming.setTimestamp(Instant.now());
        Message saved = messageRepository.save(incoming);
        System.out.println("Saved: " + saved.getId());

        TextMessage out = new TextMessage(objectMapper.writeValueAsString(saved));
        for (String memberId : conversation.getParticipantIds()) {
            Set<WebSocketSession> memberSessions = sessionsByUser.get(memberId);
            if (memberSessions == null) continue;
            for (WebSocketSession s : memberSessions) {
                if (s.isOpen()) {
                    s.sendMessage(out);
                }
            }
        }
    }
}