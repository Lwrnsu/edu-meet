package com.block_a.edu_meet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.RecentMessageCache;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatHandlerTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;
    @Autowired
    private RecentMessageCache cache;

    private WebSocketSession connect(String userId, BlockingQueue<String> inbox) throws Exception {
        return new StandardWebSocketClient().execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage m) {
                inbox.add(m.getPayload());
            }
        }, null, URI.create("ws://localhost:" + port + "/chat?userId=" + userId)).get(5, TimeUnit.SECONDS);
    }

    @Test
    void onlyMembersCanSendAndReceive() throws Exception {
        Conversation convo = conversationRepository.save(
                new Conversation(ConversationType.SUBJECT, "membership-test", List.of("member1", "member2")));
        String convoId = convo.getId();

        BlockingQueue<String> member2Inbox = new LinkedBlockingQueue<>();
        BlockingQueue<String> outsiderInbox = new LinkedBlockingQueue<>();
        WebSocketSession member1 = connect("member1", new LinkedBlockingQueue<>());
        WebSocketSession member2 = connect("member2", member2Inbox);
        WebSocketSession outsider = connect("outsider", outsiderInbox);

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
}
