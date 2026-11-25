
package com.block_a.edu_meet.quizexam.dto;

import java.math.BigDecimal;
import java.util.List;

public record GradeEssayRequest(
        List<EssayGradeData> grades
) {

    public record EssayGradeData(
            Integer questionIndex,
            BigDecimal pointsAwarded
    ) {
    }
}
