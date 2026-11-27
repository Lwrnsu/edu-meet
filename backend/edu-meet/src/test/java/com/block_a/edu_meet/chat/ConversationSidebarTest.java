package com.block_a.edu_meet.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import org.springframework.data.mongodb.core.MongoOperations;

import com.block_a.edu_meet.controllers.ConversationController;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.helpers.ConversationSummary;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.services.ConversationCreationService;

class ConversationSidebarTest {

    @Test
    void sortsByNewestMessageWithEmptyChatsLast() {
        ConversationRepository conversations = mock(ConversationRepository.class);
        MessageRepository messages = mock(MessageRepository.class);
        ConversationController controller = new ConversationController(
                conversations, mock(MemberLookup.class), messages, mock(ConversationAccess.class),
                new ConversationCreationService(conversations), mock(MongoOperations.class));

        Conversation empty = conversation("empty");
        Conversation older = conversation("older");
        Conversation newest = conversation("newest");
        when(conversations.findByParticipantIdsContaining("member"))
                .thenReturn(List.of(empty, older, newest));
        when(messages.findFirstByConversationIdOrderByTimestampDescIdDesc("older"))
                .thenReturn(new Message("older", "member", "Yesterday", Instant.parse("2026-11-14T12:00:00Z")));
        when(messages.findFirstByConversationIdOrderByTimestampDescIdDesc("newest"))
                .thenReturn(new Message("newest", "member", "Today", Instant.parse("2026-11-15T12:00:00Z")));

        List<ConversationSummary> sidebar = controller.getMyConversations("member");

        assertEquals(List.of("newest", "older", "empty"),
                sidebar.stream().map(ConversationSummary::id).toList());
        assertEquals("Today", sidebar.getFirst().lastMessageText());
        assertEquals(Instant.parse("2026-11-15T12:00:00Z"), sidebar.getFirst().lastMessageTime());
        assertNull(sidebar.getLast().lastMessageTime());

        // A new message should move the older conversation to the top on the next request.
        when(messages.findFirstByConversationIdOrderByTimestampDescIdDesc("older"))
                .thenReturn(new Message("older", "member", "Just now", Instant.parse("2026-11-15T13:00:00Z")));
        List<ConversationSummary> updated = controller.getMyConversations("member");
        assertEquals(List.of("older", "newest", "empty"),
                updated.stream().map(ConversationSummary::id).toList());
        assertEquals("Just now", updated.getFirst().lastMessageText());
    }

    private Conversation conversation(String id) {
        Conversation conversation = new Conversation(ConversationType.BLOCK, id, List.of("member"));
        conversation.setId(id);
        return conversation;
    }
}
