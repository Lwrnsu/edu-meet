package com.block_a.edu_meet;

import static com.block_a.edu_meet.support.ChatTestPrincipals.jwtAccount;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.repository.UserRepository;
import com.block_a.edu_meet.services.ChatSocketTickets;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.RecentMessageCache;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatHandlerTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ConversationRepository conversationRepository;

    @MockitoSpyBean
    private MessageRepository messageRepository;

    @Autowired
    private ObjectMapper mapper;
    @Autowired
    private RecentMessageCache cache;

    @Autowired
    private UserRepository users;

    private final List<Integer> accountIds = new ArrayList<>();

    @Autowired
    private ChatSocketTickets tickets;

    private String createAccount() {
        User user = new User();
        user.setEmail(UUID.randomUUID() + "@example.test");
        user.setFirstName("Socket");
        user.setLastName("Test");
        user.setPassword("not-used-for-ticket-tests");
        Integer id = users.save(user).getId();
        accountIds.add(id);
        return id.toString();
    }

    @AfterEach
    void removeAccounts() {
        users.deleteAllById(accountIds);
    }

    private WebSocketSession connect(String userId, BlockingQueue<String> inbox) throws Exception {
        String ticket = tickets.issue(jwtAccount(Integer.parseInt(userId)));

        return new StandardWebSocketClient().execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage m) {
                inbox.add(m.getPayload());
            }
        }, null, URI.create("ws://localhost:" + port + "/chat?ticket=" + ticket)).get(5, TimeUnit.SECONDS);
    }

    @Test
    void onlyMembersCanSendAndReceive() throws Exception {
        String firstId = createAccount();
        String secondId = createAccount();
        String outsiderId = createAccount();
        Conversation convo = conversationRepository.save(
                new Conversation(ConversationType.SUBJECT, "membership-test", List.of(firstId, secondId)));
        String convoId = convo.getId();

        BlockingQueue<String> member2Inbox = new LinkedBlockingQueue<>();
        BlockingQueue<String> outsiderInbox = new LinkedBlockingQueue<>();
        WebSocketSession member1 = connect(firstId, new LinkedBlockingQueue<>());
        WebSocketSession member2 = connect(secondId, member2Inbox);
        WebSocketSession outsider = connect(outsiderId, outsiderInbox);

        try {
            cache.putLatest(convoId, List.of());
            assertTrue(cache.getLatest(convoId, List.of()).isPresent());
            // an outsider's message is ignored
            outsider.sendMessage(new TextMessage(
                    "{\"conversationId\":\"" + convoId + "\",\"text\":\"from outsider\"}"));
            assertNull(member2Inbox.poll(1, TimeUnit.SECONDS));

            // a member's message reaches the other member, but not the outsider
            member1.sendMessage(new TextMessage(
                    "{\"conversationId\":\"" + convoId + "\",\"text\":\"from member\"}"));
            String received = member2Inbox.poll(5, TimeUnit.SECONDS);
            assertNotNull(received);
            assertTrue(cache.getLatest(convoId, List.of()).isEmpty(), "A saved send must invalidate old history");
            assertNull(outsiderInbox.poll(1, TimeUnit.SECONDS));

            // only the member's message was stored
            assertEquals(1, messageRepository.findByConversationIdOrderByTimestampDescIdDesc(
                    convoId, org.springframework.data.domain.PageRequest.of(0, 10)).size());
        } finally {
            cache.invalidate(convoId);
            member1.close();
            member2.close();
            outsider.close();
            messageRepository.deleteAll(messageRepository.findByConversationIdOrderByTimestampDescIdDesc(
                    convoId, org.springframework.data.domain.PageRequest.of(0, 50)));
            conversationRepository.deleteById(convoId);
        }
    }

    @Test
    void failedSaveNotifiesOnlyTheSender() throws Exception {
        String senderId = createAccount();
        String recipientId = createAccount();
        Conversation conversation = conversationRepository.save(
                new Conversation(ConversationType.SUBJECT, "failed-save-test", List.of(senderId, recipientId)));
        String conversationId = conversation.getId();
        BlockingQueue<String> senderInbox = new LinkedBlockingQueue<>();
        BlockingQueue<String> recipientInbox = new LinkedBlockingQueue<>();

        try (WebSocketSession recipient = connect(recipientId, recipientInbox);
             WebSocketSession sender = connect(senderId, senderInbox)) {
            cache.putLatest(conversationId, List.of());
            doThrow(new DataAccessResourceFailureException("Simulated save failure"))
                    .when(messageRepository).save(any(Message.class));

            sender.sendMessage(new TextMessage(mapper.writeValueAsString(
                    new Message(conversationId, null, "Unsaved message", null))));

            String received = senderInbox.poll(5, TimeUnit.SECONDS);
            assertNotNull(received);
            var error = mapper.readTree(received);
            assertEquals("message_error", error.path("type").asText());
            assertEquals("MESSAGE_SAVE_FAILED", error.path("code").asText());
            assertEquals(conversationId, error.path("conversationId").asText());
            assertEquals("Could not save the message. Please try again.", error.path("message").asText());
            assertTrue(sender.isOpen());
            assertNull(recipientInbox.poll(1, TimeUnit.SECONDS));
            assertTrue(messageRepository.findByConversationIdOrderByTimestampDescIdDesc(
                    conversationId, PageRequest.of(0, 10)).isEmpty());
            assertTrue(cache.getLatest(conversationId, List.of()).isPresent());
        } finally {
            cache.invalidate(conversationId);
            conversationRepository.deleteById(conversationId);
        }
    }
}
