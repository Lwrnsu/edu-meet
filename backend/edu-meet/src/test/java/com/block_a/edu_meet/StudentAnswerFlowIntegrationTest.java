package com.block_a.edu_meet;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.GradeEssayRequest;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;

import com.block_a.edu_meet.quizexam.service.ActivityService;
import com.block_a.edu_meet.quizexam.service.ActivitySessionService;
import com.block_a.edu_meet.quizexam.service.EssayGradingService;
import com.block_a.edu_meet.quizexam.service.StudentAnswerService;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;

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
class StudentAnswerFlowIntegrationTest {

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ActivitySessionService activitySessionService;

    @Autowired
    private StudentAnswerService studentAnswerService;

    @Autowired
    private EssayGradingService essayGradingService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldSubmitAnswersAndFinalizeEssayGrade() {

        // TEST IDENTITIES
        Integer facultyId = 1;
        Integer studentId = 1;
        Integer classId = 1;

        // STEP 1: CREATE QUESTIONS
        List<CreateActivityRequest.QuestionData> questions =
            List.of(

                new CreateActivityRequest.QuestionData(
                    "MULTIPLE_CHOICE",
                    "What is a blueprint for creating objects in Java?",
                    List.of(
                        "Class",
                        "Object",
                        "Method",
                        "Variable"
                    ),
                    "Class",
                    List.of(),
                    new BigDecimal("2")
                ),

                new CreateActivityRequest.QuestionData(
                    "IDENTIFICATION",
                    "What OOP concept protects data through encapsulation?",
                    List.of(),
                    "Encapsulation",
                    List.of("Encapsulation"),
                    new BigDecimal("2")
                ),

                new CreateActivityRequest.QuestionData(
                    "TRUE_FALSE",
                    "Java supports object-oriented programming.",
                    List.of("True", "False"),
                    "true",
                    List.of(),
                    new BigDecimal("1")
                ),

                new CreateActivityRequest.QuestionData(
                    "ESSAY",
                    "Explain the four pillars of OOP.",
                    List.of(),
                    null,
                    List.of(),
                    new BigDecimal("5")
                )
            );

        // STEP 2: CREATE TARGET CLASS
        List<CreateActivityRequest.TargetClassData> targetClasses =
            List.of(
                new CreateActivityRequest.TargetClassData(
                    classId,
                    "BSCS 1A",
                    "BSCS-1A"
                )
            );

        // STEP 3: CREATE ASSESSMENT
        CreateActivityRequest activityRequest =
            new CreateActivityRequest(
                "Student Answer Integration Test",
                "QUIZ",
                "Object-Oriented Programming",
                "OOP101",
                new BigDecimal("75"),
                questions,
                targetClasses
            );

        Long activityId = activityService.createDraft(
            activityRequest,
            facultyId
        );

        assertNotNull(activityId);
        assertTrue(activityId > 0);

        // STEP 4: PUBLISH THE ASSESSMENT
        activityService.updateActivityStatus(
            activityId,
            facultyId,
            "published"
        );

        // STEP 5: FACULTY STARTS THE EXAMINATION SESSION
        ActivitySessionResponse session =
            activitySessionService.startSession(
                activityId,
                facultyId
            );

        assertNotNull(session);

        Long sessionId = session.id();

        assertTrue(sessionId > 0);
        assertEquals("in_progress", session.status());

        // STEP 6: STUDENT SUBMITS ANSWERS
        SubmitAnswerRequest answerRequest =
            new SubmitAnswerRequest(
                sessionId,
                List.of(
                    new SubmitAnswerRequest.AnswerData(
                        0,
                        "Class"
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        1,
                        "Encapsulation"
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        2,
                        "True"
                    ),
                    new SubmitAnswerRequest.AnswerData(
                        3,
                        "Encapsulation protects data and keeps related methods together."
                    )
                )
            );

        StudentScoreResponse submitted =
            studentAnswerService.submitAnswers(
                answerRequest,
                studentId,
                List.of(classId)
            );

        assertNotNull(submitted);

        assertEquals(
            "pending_essay_review",
            submitted.gradingStatus()
        );

        // Objective score: 2 + 2 + 1 = 5
        assertEquals(
            0,
            submitted.objectiveScore().compareTo(
                new BigDecimal("5")
            )
        );

        // Essay has not been graded yet.
        assertNull(submitted.gradePercent());
        assertNull(submitted.isPassed());

        // STEP 7: RETRIEVE THE STUDENT ANSWER ID
        Long studentAnswerId =
            jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM student_answers
                WHERE session_id = ?
                  AND student_id = ?
                """,
                Long.class,
                sessionId,
                studentId
            );

        assertNotNull(studentAnswerId);

        // STEP 8: FACULTY GRADES THE ESSAY
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
                facultyId,
                essayRequest
            );

        // STEP 9: VERIFY FINAL SCORE
        assertEquals(
            "graded",
            finalized.gradingStatus()
        );

        // Total score: 5 objective + 5 essay = 10
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

        assertEquals(
            Boolean.TRUE,
            finalized.isPassed()
        );

        // STEP 10: VERIFY SAVED ESSAY FEEDBACK
        String feedback =
            jdbcTemplate.queryForObject(
                """
                SELECT feedback
                FROM essay_grades
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

        System.out.println(
            "MYSQL_STUDENT_ANSWER_TEST_SUCCESS"
                + " | ACTIVITY ID: " + activityId
                + " | SESSION ID: " + sessionId
                + " | STUDENT ANSWER ID: " + studentAnswerId
                + " | FINAL SCORE: 10/10"
        );
    }
}