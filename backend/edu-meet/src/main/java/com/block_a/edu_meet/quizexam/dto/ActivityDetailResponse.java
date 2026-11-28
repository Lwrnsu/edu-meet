
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ActivityDetailResponse(
        Long id,
        String name,
        String type,
        String courseName,
        String courseCode,
        BigDecimal passingGradePercent,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<QuestionData> questions,
        List<ActivityResponse.TargetClassResponse> targetClasses
) {

    public record QuestionData(
            Integer questionIndex,
            String type,
            String questionText,
            List<String> options,
            String correctAnswer,
            List<String> acceptedAnswers,
            BigDecimal points
    ) {
    }
}
