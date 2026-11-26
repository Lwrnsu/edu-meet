
package com.block_a.edu_meet;

import com.block_a.edu_meet.quizexam.dto.GradeEssayRequest;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;
import com.block_a.edu_meet.quizexam.service.EssayGradingService;
import com.block_a.edu_meet.quizexam.service.StudentAnswerService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class StudentAnswerFlowIntegrationTest {

    @Autowired
    private StudentAnswerService studentAnswerService;

    @Autowired
    private EssayGradingService essayGradingService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Reset only the local demo student's previous attempt.
    // Existing demo activity and session are preserved.
    @BeforeEach
    void resetDemoAttempt() {

        jdbcTemplate.update(
            """
            DELETE FROM public.student_answers
            WHERE session_id = ?
              AND student_id = ?
            """,
            1L,
            1
        );
    }

    @Test
    void shouldSubmitAnswersAndFinalizeEssayGrade() {

        // STEP 1: Prepare the student's answers.
        SubmitAnswerRequest request =
            new SubmitAnswerRequest(
                1L,
                List.of(
                    new SubmitAnswerRequest.AnswerData(
                        0, "class"
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        1, "Encapsulation"
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        2, "True"
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        3,
                        "Encapsulation protects data and keeps related methods together."
                    )
                )
            );

        // STEP 2: Submit and automatically score objective questions.
        StudentScoreResponse submitted =
            studentAnswerService.submitAnswers(
                request,
                1,
                List.of(1)
            );

        assertNotNull(submitted);

        assertEquals(
            "pending_essay_review",
            submitted.gradingStatus()
        );

        assertEquals(
            0,
            submitted.objectiveScore().compareTo(
                new BigDecimal("5")
            )
        );

        assertNull(submitted.gradePercent());
        assertNull(submitted.isPassed());

        // STEP 3: Retrieve the generated student answer ID.
        Long studentAnswerId =
            jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM public.student_answers
                WHERE session_id = ?
                  AND student_id = ?
                """,
                Long.class,
                1L,
                1
            );

        assertNotNull(studentAnswerId);

        // STEP 4: Grade the essay question.
        GradeEssayRequest essayRequest =
            new GradeEssayRequest(
                List.of(
                    new GradeEssayRequest.EssayGradeData(
                        3,
                        new BigDecimal("5"),
                        "Good explanation of encapsulation."
                    )
                )
            );

        StudentScoreResponse finalized =
            essayGradingService.gradeEssays(
                studentAnswerId,
                1,
                essayRequest
            );

        // STEP 5: Verify the final grade.
        assertEquals(
            "graded",
            finalized.gradingStatus()
        );

assertEquals(
    0,
    finalized.objectiveScore()
        .add(finalized.essayScore())
        .compareTo(new BigDecimal("10"))
);

        assertEquals(
            0,
            finalized.maxScore().compareTo(
                new BigDecimal("10")
            )
        );

        assertEquals(
            0,
            finalized.gradePercent().compareTo(
                new BigDecimal("100")
            )
        );

        assertEquals(Boolean.TRUE, finalized.isPassed());

        // STEP 6: Confirm that the essay feedback was saved.
        String feedback =
            jdbcTemplate.queryForObject(
                """
                SELECT feedback
                FROM public.essay_grades
                WHERE student_answer_id = ?
                  AND question_id = '3'
                """,
                String.class,
                studentAnswerId
            );

        assertEquals(
            "Good explanation of encapsulation.",
            feedback
        );
    }
}
