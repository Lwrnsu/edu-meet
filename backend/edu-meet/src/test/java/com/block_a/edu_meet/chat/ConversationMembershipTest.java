package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.block_a.edu_meet.controllers.ConversationController;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.ConversationRepository;

@SpringBootTest
class ConversationMembershipTest {

    @Autowired
    private ConversationController controller;

    @Autowired
    private ConversationRepository repository;

    private MockMvc mvc;
    private Conversation conversation;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
        conversation = repository.save(new Conversation(
                ConversationType.BLOCK, "Membership test", List.of("alice", "bob")));
    }

    @AfterEach
    void cleanUp() {
        if (conversation != null) {
            repository.deleteById(conversation.getId());
        }
    }

    @ParameterizedTest
    @EnumSource(value = ConversationType.class, names = {"BLOCK", "SUBJECT"})
    void addsOnlyNewMembers(ConversationType type) throws Exception {
        setType(type);
        mvc.perform(request(HttpMethod.POST, membersUrl())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userIds\":[\"bob\",\"charlie\",\"charlie\"]}"))
                .andExpect(status().isOk());

        assertMembers(List.of("alice", "bob", "charlie"));
    }

    @ParameterizedTest
    @EnumSource(value = ConversationType.class, names = {"BLOCK", "SUBJECT"})
    void removesOnlyTheRequestedMember(ConversationType type) throws Exception {
        setType(type);
        mvc.perform(request(HttpMethod.DELETE, membersUrl() + "/alice"))
                .andExpect(status().isOk());

        assertMembers(List.of("bob"));
    }

    @ParameterizedTest
    @EnumSource(value = ConversationType.class, names = {"BLOCK", "SUBJECT"})
    void replacesMembersAndRemovesDuplicates(ConversationType type) throws Exception {
        setType(type);
        mvc.perform(request(HttpMethod.PUT, membersUrl())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userIds\":[\"charlie\",\"dana\",\"charlie\"]}"))
                .andExpect(status().isOk());

        assertMembers(List.of("charlie", "dana"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "DELETE", "PUT"})
    void privateChatsRejectMemberChanges(String method) throws Exception {
        setType(ConversationType.PRIVATE);
        String url = membersUrl() + (method.equals("DELETE") ? "/alice" : "");
        mvc.perform(request(HttpMethod.valueOf(method), url)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userIds\":[\"charlie\"]}"))
                .andExpect(status().isBadRequest());

        assertMembers(List.of("alice", "bob"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "DELETE", "PUT"})
    void missingChatsReturnNotFound(String method) throws Exception {
        String url = "/api/conversations/missing-chat/members"
                + (method.equals("DELETE") ? "/alice" : "");
        mvc.perform(request(HttpMethod.valueOf(method), url)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userIds\":[\"charlie\"]}"))
                .andExpect(status().isNotFound());

        assertMembers(List.of("alice", "bob"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"userIds\":null}", "{\"userIds\":[]}"})
    void addAndReplaceRejectMissingOrEmptyLists(String body) throws Exception {
        for (HttpMethod method : List.of(HttpMethod.POST, HttpMethod.PUT)) {
            mvc.perform(request(method, membersUrl())
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
            assertMembers(List.of("alice", "bob"));
        }
    }

    private String membersUrl() {
        return "/api/conversations/" + conversation.getId() + "/members";
    }

    private void setType(ConversationType type) {
        conversation.setType(type);
        repository.save(conversation);
    }

    private void assertMembers(List<String> expected) {
        assertEquals(expected, repository.findById(conversation.getId())
                .orElseThrow().getParticipantIds());
    }
}
