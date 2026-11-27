package com.block_a.edu_meet.controllers;

import java.security.Principal;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.helpers.ChatIdentity;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.MessageRepository;

@RestController
@RequestMapping("/api/conversations/{conversationId}")
public class GroupChatController {

    private final ConversationAccess conversationAccess;
    private final MessageRepository messages;
    private final MongoOperations mongo;

    public GroupChatController(ConversationAccess conversationAccess, MessageRepository messages,
                               MongoOperations mongo) {
        this.conversationAccess = conversationAccess;
        this.messages = messages;
        this.mongo = mongo;
    }

    @PatchMapping("/name")
    public Conversation rename(@PathVariable String conversationId,

                               Principal principal, @RequestBody RenameRequest request) {
        String actor = requireGroupMember(conversationId, principal).userId();
        String name = request.name() == null ? "" : request.name().strip();
        if (name.isEmpty() || name.codePointCount(0, name.length()) > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name must be 1–100 characters");
        }
        return updateGroup(conversationId, actor, new Update().set("name", name));
    }

    @GetMapping("/pinned-messages")
    public List<Message> getPinnedMessages(@PathVariable String conversationId,

                                           Principal principal) {
        Conversation group = requireGroupMember(conversationId, principal).conversation();
        List<String> ids = group.getPinnedMessageIds();
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        var byId = messages.findByConversationIdAndIdIn(conversationId, ids).stream()
                .collect(Collectors.toMap(Message::getId, Function.identity()));
        return ids.stream().filter(byId::containsKey).map(byId::get).toList();
    }

    @PutMapping("/pinned-messages/{messageId}")
    public Message pin(@PathVariable String conversationId, @PathVariable String messageId,
                       Principal principal) {
        String actor = requireGroupMember(conversationId, principal).userId();
        Message message = messages.findMetadataById(messageId)
                .filter(candidate -> conversationId.equals(candidate.getConversationId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message doesn't exist"));
        updateGroup(conversationId, actor, new Update().addToSet("pinnedMessageIds", messageId));
        return message;
    }

    @DeleteMapping("/pinned-messages/{messageId}")
    public UnpinnedMessage unpin(@PathVariable String conversationId, @PathVariable String messageId,
                               Principal principal) {
        String actor = requireGroupMember(conversationId, principal).userId();
        updateGroup(conversationId, actor, new Update().pull("pinnedMessageIds", messageId));
        return new UnpinnedMessage(messageId);
    }

    private GroupMember requireGroupMember(String conversationId, Principal principal) {
        String actor = ChatIdentity.userId(principal);
        Conversation conversation = conversationAccess.requireMember(conversationId, actor);
        if (conversation.getType() != ConversationType.BLOCK && conversation.getType() != ConversationType.SUBJECT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This action is only available in group chats");
        }
        return new GroupMember(actor, conversation);
    }

    private Conversation updateGroup(String conversationId, String userId, Update update) {
        Query query = Query.query(Criteria.where("id").is(conversationId)
                .and("type").in(ConversationType.BLOCK, ConversationType.SUBJECT)
                .and("participantIds").is(userId));
        Conversation updated = mongo.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), Conversation.class);
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation doesn't exist");
        }
        return updated;
    }

    public record RenameRequest(String name) {}

    public record UnpinnedMessage(String messageId) {}

    private record GroupMember(String userId, Conversation conversation) {}
}
