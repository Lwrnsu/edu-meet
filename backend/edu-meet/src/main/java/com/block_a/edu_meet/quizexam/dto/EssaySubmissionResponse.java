
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.util.List;

public record EssaySubmissionResponse(
        Long studentAnswerId,
        Long activityId,
        Long sessionId,
        Integer studentId,
        String activityName,
        String submissionStatus,
        String gradingStatus,
        List<EssayQuestionResponse> essays
) {

    public record EssayQuestionResponse(
            Integer questionIndex,
            String questionText,
            String studentAnswer,
            BigDecimal maxPoints,
            BigDecimal pointsAwarded,
            String feedback,
            boolean graded
    ) {
    }
}
