package com.block_a.edu_meet.quizexam.dto;

import java.util.List;

public record SubmitAnswerRequest(
        Long sessionId,
        List<AnswerData> answers
) {

    public record AnswerData(
            Integer questionIndex,
            String answer
    ) {
    }
}