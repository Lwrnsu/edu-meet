package com.block_a.edu_meet.quizexam.dto;

import java.time.LocalDateTime;

public record ActivitySessionResponse(
        Long id,
        Long activityId,
        String status,
        LocalDateTime startedAt,
        LocalDateTime endedAt
) {
}