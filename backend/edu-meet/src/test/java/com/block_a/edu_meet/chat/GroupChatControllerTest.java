package com.block_a.edu_meet.chat;

import static com.block_a.edu_meet.support.ChatTestPrincipals.rosterManager;
import static com.block_a.edu_meet.support.ChatTestPrincipals.account;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.block_a.edu_meet.controllers.CommunicationApiResponseAdvice;
import com.block_a.edu_meet.controllers.ConversationController;
import com.block_a.edu_meet.controllers.GroupChatController;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;

@SpringBootTest
class GroupChatControllerTest {

    @Autowired private GroupChatController groupController;
    @Autowired private ConversationController conversationsController;
    @Autowired private ConversationRepository conversations;
    @Autowired private MessageRepository messages;

    private MockMvc mvc;
    private Conversation group;
    private Conversation other;
    private Message first;
    private Message second;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(groupController, conversationsController)
                .setControllerAdvice(new CommunicationApiResponseAdvice()).build();
        group = conversations.save(new Conversation(ConversationType.BLOCK, "Original", List.of("php:1", "php:2")));
        other = conversations.save(new Conversation(ConversationType.PRIVATE, null, List.of("php:1", "php:2")));
        Instant now = Instant.now();
        first = messages.save(new Message(group.getId(), "php:1", "First message", now));
        second = messages.save(new Message(other.getId(), "php:2", "Different chat", now.minusSeconds(10)));
    }

    @AfterEach
    void cleanUp() {
        messages.deleteAll(List.of(first, second));
        conversations.deleteAll(List.of(group, other));
    }

    @Test
    void renameUsesVerifiedMemberAndUpdatesSidebar() throws Exception {
        mvc.perform(patch(groupUrl() + "/name").principal(account(1))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" New name \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body.name").value("New name"));

        mvc.perform(get("/api/conversations").principal(account(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body[0].id").value(group.getId()))
                .andExpect(jsonPath("$.body[0].name").value("New name"));
    }

    @Test
    void rejectsUnverifiedUserOutsiderPrivateChatAndBlankName() throws Exception {
        mvc.perform(get(groupUrl() + "/pinned-messages").param("userId", "php:1"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(pinUrl(first)).principal(account(4)).param("userId", "php:1"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/conversations/" + other.getId() + "/pinned-messages").principal(account(1)))
                .andExpect(status().isBadRequest());
        mvc.perform(patch(groupUrl() + "/name").principal(account(1))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void pinAndUnpinAreIdempotentAndOnlyAcceptMessagesInTheGroup() throws Exception {
        String pins = groupUrl() + "/pinned-messages";
        mvc.perform(get(pins).principal(account(2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body").isEmpty());
        mvc.perform(put(pinUrl(second)).principal(account(1)))
                .andExpect(status().isNotFound());
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(put(pinUrl(first)).principal(account(1)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.body.id").value(first.getId()));
        }

        mvc.perform(put(groupUrl() + "/members").principal(rosterManager()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userIds\":[\"php:1\",\"php:2\",\"php:3\"]}"))
                .andExpect(status().isOk());
        mvc.perform(get(pins).principal(account(3)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body.length()").value(1))
                .andExpect(jsonPath("$.body[0].id").value(first.getId()));

        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(delete(pinUrl(first)).principal(account(2))).andExpect(status().isOk());
        }
        mvc.perform(get(pins).principal(account(1)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.body").isEmpty());
    }

    private String groupUrl() {
        return "/api/conversations/" + group.getId();
    }

    private String pinUrl(Message message) {
        return groupUrl() + "/pinned-messages/" + message.getId();
    }
}
