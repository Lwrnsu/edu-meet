package com.block_a.edu_meet.helpers;

import java.util.List;

public record CreateClassConversationRequest(
        String classId,
        String subjectName,
        List<String> facultyIds,
        List<String> studentIds) {
}
