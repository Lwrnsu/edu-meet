package com.block_a.edu_meet.helpers;

import java.time.Instant;
import java.util.List;
import com.block_a.edu_meet.models.ConversationType;

public record ConversationSummary(
        String id,
        ConversationType type,
        String name,
        String avatarUrl,
        List<String> participantIds,
        String lastMessageText,
        Instant lastMessageTime,
        String lastMessageId,
        String lastMessageSenderId,
        String lastMessageSenderName,
        String lastMessageAttachmentContentType) {
}
