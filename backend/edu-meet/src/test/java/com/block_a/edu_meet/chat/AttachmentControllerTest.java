package com.block_a.edu_meet.chat;

import static com.block_a.edu_meet.support.ChatTestPrincipals.account;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.block_a.edu_meet.controllers.AttachmentController;
import com.block_a.edu_meet.controllers.CommunicationApiResponseAdvice;
import com.block_a.edu_meet.controllers.MessageController;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.RecentMessageCache;

@SpringBootTest
class AttachmentControllerTest {

    @Autowired private AttachmentController attachments;
    @Autowired private MessageController history;
    @Autowired private ConversationRepository conversations;
    @Autowired private MessageRepository messages;
    @Autowired private RecentMessageCache cache;

    private Conversation conversation;
    private MockMvc mvc;
    private String path;

    @BeforeEach
    void setUp() {
        conversation = conversations.save(new Conversation(ConversationType.BLOCK, "Attachments", List.of("php:1", "php:2")));
        path = "/api/conversations/" + conversation.getId() + "/messages";
        mvc = MockMvcBuilders.standaloneSetup(attachments, history)
                .setControllerAdvice(new CommunicationApiResponseAdvice()).build();
    }

    @AfterEach
    void cleanUp() {
        cache.invalidate(conversation.getId());
        messages.deleteAll(messages.findByConversationIdOrderByTimestampDescIdDesc(conversation.getId(), Pageable.ofSize(10)));
        conversations.deleteById(conversation.getId());
    }

    @Test
    void persistsFileWithMessageAndServesItOnlyToMembers() throws Exception {
        byte[] bytes = "A chat file".getBytes(StandardCharsets.UTF_8);
        mvc.perform(multipart(path + "/attachments")
                        .file(new MockMultipartFile("file", "../notes.txt", "text/plain", bytes))
                        .principal(account(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body.senderId").value("php:1"))
                .andExpect(jsonPath("$.body.attachment.name").value("notes.txt"))
                .andExpect(jsonPath("$.body.attachmentBytes").doesNotExist());

        var summary = messages.findFirstByConversationIdOrderByTimestampDescIdDesc(conversation.getId());
        assertNull(summary.getAttachmentBytes());
        mvc.perform(get(path).principal(account(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body[0].attachment.name").value("notes.txt"))
                .andExpect(jsonPath("$.body[0].attachmentBytes").doesNotExist());

        String url = path + "/" + summary.getId() + "/attachment";
        mvc.perform(get(url).principal(account(2)).param("inline", "true"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/octet-stream"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment;")))
                .andExpect(content().bytes(bytes));
        mvc.perform(get(url).principal(account(4)).param("userId", "php:2"))
                .andExpect(status().isNotFound());
        mvc.perform(get(url).param("userId", "php:2")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsEmptyAndOversizedUploads() throws Exception {
        mvc.perform(multipart(path + "/attachments")
                        .file(new MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]))
                        .principal(account(1)))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(path + "/attachments")
                        .file(new MockMultipartFile("file", "large.txt", "text/plain", new byte[5 * 1024 * 1024 + 1]))
                        .principal(account(1)))
                .andExpect(status().isPayloadTooLarge());
    }
}
