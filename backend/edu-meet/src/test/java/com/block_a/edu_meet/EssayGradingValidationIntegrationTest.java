
package com.block_a.edu_meet;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.GradeEssayRequest;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;
import com.block_a.edu_meet.quizexam.service.ActivityService;
import com.block_a.edu_meet.quizexam.service.ActivitySessionService;
import com.block_a.edu_meet.quizexam.service.EssayGradingService;
import com.block_a.edu_meet.quizexam.service.StudentAnswerService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class EssayGradingValidationIntegrationTest {

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ActivitySessionService sessionService;

    @Autowired
    private StudentAnswerService answerService;

    @Autowired
    private EssayGradingService gradingService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final Integer FACULTY_ID = 1;
    private static final Integer STUDENT_ID = 1;
    private static final Integer CLASS_ID = 1;

    private record Submission(Long activityId, Long studentAnswerId) {}

    // CREATE A TEST SUBMISSION WITH TWO ESSAY QUESTIONS
    private Submission createSubmission() {

        List<CreateActivityRequest.QuestionData> questions = List.of(
            new CreateActivityRequest.QuestionData(
                "MULTIPLE_CHOICE",
                "What is a blueprint for creating objects in Java?",
                List.of("Class", "Object", "Method", "Variable"),
                "Class",
                List.of(),
                new BigDecimal("2")
            ),
            new CreateActivityRequest.QuestionData(
                "ESSAY",
                "Explain encapsulation.",
                List.of(),
                null,
                List.of(),
                new BigDecimal("5")
            ),
            new CreateActivityRequest.QuestionData(
                "ESSAY",
                "Explain inheritance.",
                List.of(),
                null,
                List.of(),
                new BigDecimal("3")
            )
        );

        List<CreateActivityRequest.TargetClassData> targets = List.of(
            new CreateActivityRequest.TargetClassData(
                CLASS_ID,
                "BSCS 1A",
                "BSCS-1A"
            )
        );

        CreateActivityRequest request = new CreateActivityRequest(
            "Essay Grading Validation Test",
            "QUIZ",
            "Object-Oriented Programming",
            "OOP101",
            new BigDecimal("70"),
            questions,
            targets
        );

        Long activityId = activityService.createDraft(
            request,
            FACULTY_ID
        );

        activityService.updateActivityStatus(
            activityId,
            FACULTY_ID,
            "published"
        );

        var session = sessionService.startSession(
            activityId,
            FACULTY_ID
        );

        answerService.submitAnswers(
            new SubmitAnswerRequest(
                session.id(),
                List.of(
                    new SubmitAnswerRequest.AnswerData(0, "Class"),
                    new SubmitAnswerRequest.AnswerData(
                        1,
                        "Encapsulation protects data."
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        2,
                        "Inheritance allows code reuse."
                    )
                )
            ),
            STUDENT_ID,
            List.of(CLASS_ID)
        );

        Long studentAnswerId = jdbcTemplate.queryForObject(
            """
            SELECT id
            FROM student_answers
            WHERE session_id = ?
              AND student_id = ?
            """,
            Long.class,
            session.id(),
            STUDENT_ID
        );

        assertNotNull(studentAnswerId);

        return new Submission(activityId, studentAnswerId);
    }

    // TEST PARTIAL GRADING, COMPLETION, AND REGRADE
    @Test
    void shouldSupportPartialGradingCompletionAndRegrading() {

        Submission submission = createSubmission();

        // Grade the first essay only.
        var partial = gradingService.gradeEssays(
            submission.studentAnswerId(),
            FACULTY_ID,
            new GradeEssayRequest(
                List.of(
                    new GradeEssayRequest.EssayGradeData(
                        1,
                        new BigDecimal("4"),
                        "Good explanation."
                    )
                )
            )
        );

        assertEquals("pending_essay_review", partial.gradingStatus());
        assertNull(partial.gradePercent());
        assertNull(partial.isPassed());

        // Grade the second essay.
        var completed = gradingService.gradeEssays(
            submission.studentAnswerId(),
            FACULTY_ID,
            new GradeEssayRequest(
                List.of(
                    new GradeEssayRequest.EssayGradeData(
                        2,
                        new BigDecimal("2"),
                        "Good explanation."
                    )
                )
            )
        );

        assertEquals("graded", completed.gradingStatus());
        assertEquals(
            0,
            completed.essayScore().compareTo(new BigDecimal("6"))
        );
        assertEquals(
            0,
            completed.totalScore().compareTo(new BigDecimal("8"))
        );
        assertEquals(
            0,
            completed.gradePercent().compareTo(new BigDecimal("80"))
        );
        assertEquals(Boolean.TRUE, completed.isPassed());

        // Regrade the first essay. It should update, not duplicate.
        var regraded = gradingService.gradeEssays(
            submission.studentAnswerId(),
            FACULTY_ID,
            new GradeEssayRequest(
                List.of(
                    new GradeEssayRequest.EssayGradeData(
                        1,
                        new BigDecimal("3"),
                        "Revised evaluation."
                    )
                )
            )
        );

        assertEquals("graded", regraded.gradingStatus());
        assertEquals(
            0,
            regraded.essayScore().compareTo(new BigDecimal("5"))
        );
        assertEquals(
            0,
            regraded.totalScore().compareTo(new BigDecimal("7"))
        );
        assertEquals(
            0,
            regraded.gradePercent().compareTo(new BigDecimal("70"))
        );

        Integer gradeCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM essay_grades
            WHERE student_answer_id = ?
            """,
            Integer.class,
            submission.studentAnswerId()
        );

        assertEquals(2, gradeCount);
    }

    // TEST REJECTION OF SCORES ABOVE MAXIMUM POINTS
    @Test
    void shouldRejectEssayScoreAboveMaximumPoints() {

        Submission submission = createSubmission();

        assertThrows(
            IllegalArgumentException.class,
            () -> gradingService.gradeEssays(
                submission.studentAnswerId(),
                FACULTY_ID,
                new GradeEssayRequest(
                    List.of(
                        new GradeEssayRequest.EssayGradeData(
                            1,
                            new BigDecimal("6"),
                            "Invalid score."
                        )
                    )
                )
            )
        );

        Integer gradeCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM essay_grades
            WHERE student_answer_id = ?
            """,
            Integer.class,
            submission.studentAnswerId()
        );

        assertEquals(0, gradeCount);
    }

    // TEST THAT ANOTHER FACULTY MEMBER CANNOT GRADE THE SUBMISSION
    @Test
    void shouldRejectUnauthorizedFacultyGrading() {

        Submission submission = createSubmission();

        assertThrows(
            IllegalArgumentException.class,
            () -> gradingService.gradeEssays(
                submission.studentAnswerId(),
                999,
                new GradeEssayRequest(
                    List.of(
                        new GradeEssayRequest.EssayGradeData(
                            1,
                            new BigDecimal("3"),
                            "Unauthorized grading attempt."
                        )
                    )
                )
            )
        );

        Integer gradeCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM essay_grades
            WHERE student_answer_id = ?
            """,
            Integer.class,
            submission.studentAnswerId()
        );

        assertEquals(0, gradeCount);
    }
}
