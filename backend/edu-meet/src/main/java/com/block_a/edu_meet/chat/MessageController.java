package com.block_a.edu_meet.chat;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/conversations")
public class MessageController {

    private static final int PAGE_SIZE = 20;

    private final MessageRepository messageRepository;
    private final ConversationAccess conversationAccess;

    public MessageController(MessageRepository messageRepository,
                             ConversationAccess conversationAccess) {
        this.messageRepository = messageRepository;
        this.conversationAccess = conversationAccess;
    }

    @GetMapping("/{conversationId}/messages")
    public List<Message> getLatestMessages(@PathVariable String conversationId,
                                          @RequestParam String userId) {
        conversationAccess.requireMember(conversationId, userId);
        return messageRepository.findByConversationIdOrderByTimestampDescIdDesc(
                conversationId, PageRequest.of(0, PAGE_SIZE));
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
