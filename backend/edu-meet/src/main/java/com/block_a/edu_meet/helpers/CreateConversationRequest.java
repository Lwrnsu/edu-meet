package com.block_a.edu_meet.helpers;

import java.util.List;
import com.block_a.edu_meet.models.ConversationType;

public record CreateConversationRequest(
        ConversationType type,
        String name,
        List<String> participantIds,
        String blockId,
        String classId) {
}
