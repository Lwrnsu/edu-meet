package com.block_a.edu_meet.chat;

import java.util.List;

public record CreateConversationRequest(
        ConversationType type,
        String name,
        List<String> participantIds,
        String blockId,
        String classId) {
}