
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.util.List;

public record UpdateActivityRequest(
        String name,
        String type,
        String courseName,
        String courseCode,
        BigDecimal passingGradePercent,
        List<CreateActivityRequest.QuestionData> questions,
        List<CreateActivityRequest.TargetClassData> targetClasses
) {
}
