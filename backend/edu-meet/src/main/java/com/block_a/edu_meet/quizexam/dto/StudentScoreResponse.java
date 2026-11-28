
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StudentScoreResponse(
        Long activityId,
        String activityName,
        String activityType,
        String courseName,
        String courseCode,
        BigDecimal objectiveScore,
        BigDecimal essayScore,
        BigDecimal totalScore,
        BigDecimal maxScore,
        BigDecimal gradePercent,
        Boolean isPassed,
        String gradingStatus,
        LocalDateTime submittedAt,
        LocalDateTime gradedAt
) {
}
