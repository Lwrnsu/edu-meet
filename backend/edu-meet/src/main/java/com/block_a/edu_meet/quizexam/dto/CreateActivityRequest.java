package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.util.List;

public record CreateActivityRequest(
        String name,
        String type,
        String courseName,
        String courseCode,
        BigDecimal passingGradePercent,
        List<QuestionData> questions,
        List<TargetClassData> targetClasses
) {

    public record QuestionData(
            String type,
            String questionText,
            List<String> options,
            String correctAnswer,
            List<String> acceptedAnswers,
            BigDecimal points
    ) {
    }

    public record TargetClassData(
            Integer classId,
            String className,
            String classCode
    ) {
    }
}