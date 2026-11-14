package com.block_a.edu_meet.chat;

import java.time.Instant;
import java.util.List;

public record ConversationSummary(
        String id,
        ConversationType type,
        String name,
        String avatarUrl,
        List<String> participantIds,
        String lastMessageText,
        Instant lastMessageTime) {
}