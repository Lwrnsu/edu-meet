
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.util.List;

public record StudentAssessmentResponse(
        Long id,
        String name,
        String type,
        String courseName,
        String courseCode,
        List<QuestionData> questions
) {

    public record QuestionData(
            Integer questionIndex,
            String type,
            String questionText,
            List<String> options,
            BigDecimal points
    ) {
    }
}
