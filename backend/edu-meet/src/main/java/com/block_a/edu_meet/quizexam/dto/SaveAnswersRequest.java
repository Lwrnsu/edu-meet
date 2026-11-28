
package com.block_a.edu_meet.quizexam.dto;

import java.util.List;

public record SaveAnswersRequest(
        List<SubmitAnswerRequest.AnswerData> answers
) {
}
