package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.controllers.ConversationController;
import com.block_a.edu_meet.helpers.CreateConversationRequest;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.ConversationRepository;

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
    void reusesLegacyPrivateChatWithoutChangingItsId() {
        String first = UUID.randomUUID().toString();
        String second = UUID.randomUUID().toString();
        Conversation legacy = repository.save(new Conversation(
                ConversationType.PRIVATE, null, List.of(first, second)));
        createdIds.add(legacy.getId());
        assertEquals(legacy.getId(), create(new CreateConversationRequest(
                ConversationType.PRIVATE, null, List.of(second, first), null, null)).getId());
    }

    @ParameterizedTest
    @EnumSource(value = ConversationType.class, names = {"BLOCK", "SUBJECT"})
    void reusesLegacyGroupWithoutChangingItsMembers(ConversationType type) {
        String key = UUID.randomUUID().toString();
        Conversation legacy = new Conversation(type, "Original name", List.of("original-member"));
        legacy.setBlockId(type == ConversationType.BLOCK ? key : null);
        legacy.setClassId(type == ConversationType.SUBJECT ? key : null);
        legacy = repository.save(legacy);
        createdIds.add(legacy.getId());
        Conversation result = create(new CreateConversationRequest(type, "Different name", List.of("other-member"),
                legacy.getBlockId(), legacy.getClassId()));
        assertEquals(legacy.getId(), result.getId());
        assertEquals(List.of("original-member"), repository.findById(result.getId()).orElseThrow().getParticipantIds());
        assertEquals("Original name", result.getName());
    }

    @Test
    void rejectsInvalidPrivateParticipants() {
        for (List<String> ids : List.of(List.of("same", "same"), List.of("member", " "),
                java.util.Arrays.asList("member", null))) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                    controller.createConversation(new CreateConversationRequest(
                            ConversationType.PRIVATE, null, ids, null, null)));
            assertEquals(400, error.getStatusCode().value());
        }
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
