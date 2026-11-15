package com.block_a.edu_meet.chat;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations")
public class MessageController {

    private static final int PAGE_SIZE = 20;

    private final MessageRepository messageRepository;
    private final RecentMessageCache recentMessageCache;
    private final ConversationAccess conversationAccess;

    public MessageController(MessageRepository messageRepository,
                             RecentMessageCache recentMessageCache,
                             ConversationAccess conversationAccess) {
        this.messageRepository = messageRepository;
        this.recentMessageCache = recentMessageCache;
        this.conversationAccess = conversationAccess;
    }

    @GetMapping("/{conversationId}/messages")
    public List<Message> getLatestMessages(@PathVariable String conversationId,
                                          @RequestParam String userId) {
        conversationAccess.requireMember(conversationId, userId);
        List<Message> cached = recentMessageCache.getLatest(conversationId, PAGE_SIZE);
        if (cached.size() == PAGE_SIZE) {
            return cached;
        }
        return messageRepository.findByConversationIdOrderByTimestampDesc(
                conversationId, PageRequest.of(0, PAGE_SIZE));
    }

    @GetMapping("/{conversationId}/messages/older")
    public List<Message> getOlderMessages(
            @PathVariable String conversationId,
            @RequestParam String userId,
            @RequestParam Instant before) {
        conversationAccess.requireMember(conversationId, userId);
        return messageRepository.findByConversationIdAndTimestampBeforeOrderByTimestampDesc(
                conversationId, before, PageRequest.of(0, PAGE_SIZE));
    }
}
