package com.block_a.edu_meet.controllers;

import java.util.List;

import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.repositories.MessageRepository;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.services.RecentMessageCache;
import com.block_a.edu_meet.models.Message;

/* 
    Must return API response, not the data instantly. 
    {
        response: true / false
        code: ex. 404
        message: ex. "Conversation Doesn't Exist"
        body: the data itself. 
    }
*/
@Profile("chat")
@RestController
@RequestMapping("/api/conversations")
public class MessageController {

    private static final int PAGE_SIZE = 20;

    private final MessageRepository messageRepository;
    private final ConversationAccess conversationAccess;
    private final RecentMessageCache recentMessageCache;

    public MessageController(MessageRepository messageRepository,
                             ConversationAccess conversationAccess,
                             RecentMessageCache recentMessageCache) {
        this.messageRepository = messageRepository;
        this.conversationAccess = conversationAccess;
        this.recentMessageCache = recentMessageCache;
    }

    @GetMapping("/{conversationId}/messages")
    public List<Message> getLatestMessages(@PathVariable String conversationId,
                                          @RequestParam String userId) {
        conversationAccess.requireMember(conversationId, userId);
        List<String> recentIds = messageRepository.findRecentIds(
                        conversationId, PageRequest.of(0, RecentMessageCache.MAX_MESSAGES))
                .stream().map(Message::getId).toList();
        var cached = recentMessageCache.getLatest(conversationId, recentIds);
        if (cached.isPresent()) {
            return cached.get().stream().limit(PAGE_SIZE).toList();
        }
        List<Message> recent = messageRepository.findByConversationIdOrderByTimestampDescIdDesc(
                conversationId, PageRequest.of(0, RecentMessageCache.MAX_MESSAGES));
        recentMessageCache.putLatest(conversationId, recent);
        return recent.stream().limit(PAGE_SIZE).toList();
    }

    @GetMapping("/{conversationId}/messages/older")
    public List<Message> getOlderMessages(
            @PathVariable String conversationId,
            @RequestParam String userId,
            @RequestParam String beforeId) {
        conversationAccess.requireMember(conversationId, userId);
        if (beforeId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "beforeId is required");
        }
        Message cursor = messageRepository.findById(beforeId)
                .filter(message -> conversationId.equals(message.getConversationId()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "beforeId must refer to a message in this chat"));
        return messageRepository.findOlderMessages(
                conversationId, cursor.getTimestamp(), cursor.getId(), PageRequest.of(0, PAGE_SIZE));
    }
}

