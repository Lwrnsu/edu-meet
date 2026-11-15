package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ConversationCreationTest {

    @Autowired
    private ConversationController controller;

    @Autowired
    private ConversationRepository repository;

    private final Set<String> createdIds = new HashSet<>();

    private Conversation create(CreateConversationRequest request) {
        Conversation conversation = controller.createConversation(request);
        createdIds.add(conversation.getId());
        return conversation;
    }

    @AfterEach
    void cleanUp() {
        repository.deleteAllById(createdIds);
    }

    @Test
    void reusesPrivateChatRegardlessOfParticipantOrder() {
        String first = UUID.randomUUID().toString();
        String second = UUID.randomUUID().toString();
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.PRIVATE, null, List.of(first, second), null, null);

        Conversation original = create(request);
        assertEquals(original.getId(), create(request).getId());
        assertEquals(original.getId(), create(new CreateConversationRequest(
                ConversationType.PRIVATE, null, List.of(second, first), null, null)).getId());
        assertEquals(1, repository.findByTypeAndParticipantIdsContaining(
                ConversationType.PRIVATE, first).size());
    }

    @Test
    void reusesBlockChatOnlyForTheSameBlock() {
        String blockId = UUID.randomUUID().toString();
        List<String> members = List.of(UUID.randomUUID().toString());
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.BLOCK, "Duplicate check block", members, blockId, null);

        Conversation original = create(request);
        assertEquals(original.getId(), create(request).getId());
        assertNotEquals(original.getId(), create(new CreateConversationRequest(
                ConversationType.BLOCK, "Duplicate check block", members,
                UUID.randomUUID().toString(), null)).getId());
        assertEquals(2, repository.findByTypeAndParticipantIdsContaining(
                ConversationType.BLOCK, members.getFirst()).size());
    }

    @Test
    void reusesSubjectChatOnlyForTheSameClass() {
        String classId = UUID.randomUUID().toString();
        List<String> members = List.of(UUID.randomUUID().toString());
        CreateConversationRequest request = new CreateConversationRequest(
                ConversationType.SUBJECT, "Duplicate check subject", members, null, classId);

        Conversation original = create(request);
        assertEquals(original.getId(), create(request).getId());
        assertNotEquals(original.getId(), create(new CreateConversationRequest(
                ConversationType.SUBJECT, "Duplicate check subject", members, null,
                UUID.randomUUID().toString())).getId());
        assertEquals(2, repository.findByTypeAndParticipantIdsContaining(
                ConversationType.SUBJECT, members.getFirst()).size());
    }
}
