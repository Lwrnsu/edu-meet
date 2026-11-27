package com.block_a.edu_meet.chat;

import static com.block_a.edu_meet.support.ChatTestPrincipals.account;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.controllers.GroupChatController;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.handlers.ChatHandler;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.ConversationMembershipService;

class DirectPinningTest {
    private final ConversationRepository conversations = mock(ConversationRepository.class);
    private final MessageRepository messages = mock(MessageRepository.class);
    private final MongoOperations mongo = mock(MongoOperations.class);
    private final ChatHandler chat = mock(ChatHandler.class);
    private final GroupChatController controller =
            new GroupChatController(new ConversationAccess(conversations), messages, mongo, chat,
                    new ConversationMembershipService(mongo));
    private final Conversation direct = new Conversation(ConversationType.PRIVATE, null, List.of("php:1", "php:2"));

    @Test
    void usesAtomicMemberScopedUpdatesAndPublishesAfterEachMutation() {
        direct.setId("direct");
        var message = new Message("direct", "php:1", "Hello", Instant.EPOCH);
        message.setId("message");
        when(conversations.findById("direct")).thenReturn(Optional.of(direct));
        when(messages.findMetadataById("message")).thenReturn(Optional.of(message));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(), eq(Conversation.class)))
                .thenReturn(direct);

        assertEquals(message, controller.pin("direct", "message", account(1)));
        assertEquals("message", controller.unpin("direct", "message", account(2)).messageId());

        var query = ArgumentCaptor.forClass(Query.class);
        var update = ArgumentCaptor.forClass(Update.class);
        verify(mongo, times(2)).findAndModify(query.capture(), update.capture(), any(), eq(Conversation.class));
        assertEquals("php:1", query.getAllValues().getFirst().getQueryObject().get("participantIds"));
        assertEquals("php:2", query.getAllValues().getLast().getQueryObject().get("participantIds"));
        assertEquals(ConversationType.PRIVATE, query.getValue().getQueryObject().get("type"));
        assertEquals("message", update.getAllValues().getFirst().getUpdateObject()
                .get("$addToSet", org.bson.Document.class).get("pinnedMessageIds"));
        assertEquals("message", update.getValue().getUpdateObject()
                .get("$pull", org.bson.Document.class).get("pinnedMessageIds"));
        verify(chat, times(2)).publishPinsChanged(direct);
    }

    @Test
    void rejectsOutsidersCrossConversationMessagesAndPrivateRename() {
        when(conversations.findById("direct")).thenReturn(Optional.of(direct));
        when(messages.findMetadataById("foreign")).thenReturn(
                Optional.of(new Message("other", "php:1", "Other", Instant.EPOCH)));
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.getPinnedMessages("direct", account(3))).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.pin("direct", "foreign", account(1))).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.unpin("direct", "foreign", account(2))).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.rename("direct", account(1), new GroupChatController.RenameRequest("New")))
                .getStatusCode());
        verifyNoInteractions(mongo, chat);
    }
}
