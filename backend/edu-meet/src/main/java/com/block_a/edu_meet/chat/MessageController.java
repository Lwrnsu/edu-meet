package com.block_a.edu_meet.chat;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Instant;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/conversations")
public class MessageController {

    private final MessageRepository messageRepository;

    public MessageController(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    @GetMapping("/{conversationId}/messages")
    public List<Message> getLatestMessages(@PathVariable String conversationId) {
        return messageRepository.findByConversationIdOrderByTimestampDesc(
                conversationId, PageRequest.of(0, 20));
    }

        @GetMapping("/{conversationId}/messages/older")
    public List<Message> getOlderMessages(
            @PathVariable String conversationId,
            @RequestParam Instant before) {
        return messageRepository.findByConversationIdAndTimestampBeforeOrderByTimestampDesc(
                conversationId, before, PageRequest.of(0, 20));
    }
}