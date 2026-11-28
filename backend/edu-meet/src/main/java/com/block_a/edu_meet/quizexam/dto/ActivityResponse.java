package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ActivityResponse(
        Long id,
        String name,
        String type,
        String courseName,
        String courseCode,
        BigDecimal passingGradePercent,
        String status,
        LocalDateTime createdAt,
        int questionCount,
        List<TargetClassResponse> targetClasses
) {

    public record TargetClassResponse(
            Integer classId,
            String className,
            String classCode
    ) {
    }
}