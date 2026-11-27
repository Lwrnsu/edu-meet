package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.data.mongodb.core.MongoOperations;

import com.block_a.edu_meet.controllers.ConversationController;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.helpers.CreateConversationRequest;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.ConversationCreationService;

@SpringBootTest
class ConcurrentConversationCreationTest {

    @Autowired
    private ConversationRepository repository;

    private final String first = UUID.randomUUID().toString();
    private final String second = UUID.randomUUID().toString();

    @AfterEach
    void cleanUp() {
        repository.deleteAll(repository.findByParticipantIdsContaining(first));
    }

    @ParameterizedTest
    @EnumSource(ConversationType.class)
    void simultaneousRequestsCreateOneConversation(ConversationType type) throws Exception {
        ConversationRepository racingRepository = mock(ConversationRepository.class, delegatesTo(repository));
        CyclicBarrier bothChecked = new CyclicBarrier(2);

        // Both requests must observe an empty result before either is allowed to insert.
        if (type == ConversationType.PRIVATE) {
            doAnswer(call -> {
                List<Conversation> found = repository.findByTypeAndParticipantIdsContaining(
                        call.getArgument(0), call.getArgument(1));
                bothChecked.await(5, TimeUnit.SECONDS);
                return found;
            }).when(racingRepository).findByTypeAndParticipantIdsContaining(any(), anyString());
        } else if (type == ConversationType.BLOCK) {
            doAnswer(call -> {
                Conversation found = repository.findFirstByTypeAndBlockId(call.getArgument(0), call.getArgument(1));
                bothChecked.await(5, TimeUnit.SECONDS);
                return found;
            }).when(racingRepository).findFirstByTypeAndBlockId(any(), anyString());
        } else {
            doAnswer(call -> {
                Conversation found = repository.findFirstByTypeAndClassId(call.getArgument(0), call.getArgument(1));
                bothChecked.await(5, TimeUnit.SECONDS);
                return found;
            }).when(racingRepository).findFirstByTypeAndClassId(any(), anyString());
        }

        ConversationController controller = new ConversationController(racingRepository,
                mock(MemberLookup.class), mock(MessageRepository.class), mock(ConversationAccess.class),
                new ConversationCreationService(racingRepository), mock(MongoOperations.class));
        CreateConversationRequest request = new CreateConversationRequest(type, "Concurrent test",
                List.of(first, second), first, first);
        CreateConversationRequest other = new CreateConversationRequest(type, "Other request name",
                type == ConversationType.PRIVATE ? List.of(second, first) : List.of(first, "other-member"), first, first);

        try (var workers = Executors.newFixedThreadPool(2)) {
            var left = workers.submit(() -> controller.createConversation(request));
            var right = workers.submit(() -> controller.createConversation(other));
            Conversation leftChat = left.get(10, TimeUnit.SECONDS);
            Conversation rightChat = right.get(10, TimeUnit.SECONDS);
            assertEquals(leftChat.getId(), rightChat.getId());
            Conversation stored = repository.findById(leftChat.getId()).orElseThrow();
            assertEquals(stored.getName(), leftChat.getName());
            assertEquals(stored.getName(), rightChat.getName());
            assertEquals(stored.getParticipantIds(), leftChat.getParticipantIds());
            assertEquals(stored.getParticipantIds(), rightChat.getParticipantIds());
        }
        assertEquals(1, repository.findByParticipantIdsContaining(first).size());
    }
}
