
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FacultyStudentScoreResponse(
        Long studentAnswerId,
        Long sessionId,
        Long studentId,
        String submissionStatus,
        String gradingStatus,
        BigDecimal objectiveScore,
        BigDecimal essayScore,
        BigDecimal totalScore,
        BigDecimal maxScore,
        BigDecimal gradePercent,
        Boolean isPassed,
        LocalDateTime submittedAt,
        LocalDateTime gradedAt
) {
}
