package com.block_a.edu_meet.quizexam;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;
import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.SaveAnswersRequest;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;

import com.block_a.edu_meet.quizexam.service.ActivityService;
import com.block_a.edu_meet.quizexam.service.ActivitySessionService;
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
class ActivitySessionLifecycleIntegrationTest {

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ActivitySessionService activitySessionService;

    @Autowired
    private StudentAnswerService studentAnswerService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldAutomaticallySubmitAndScoreAnswersWhenFacultyEndsSession() {

        // TEST IDENTITIES
        Integer facultyId = 1;
        Integer studentId = 1;
        Integer classId = 1;

        // STEP 1: CREATE OBJECTIVE QUESTIONS
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
                    "What OOP concept protects data?",
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
                )
            );

        // STEP 2: ASSIGN THE TARGET CLASS
        List<CreateActivityRequest.TargetClassData> targetClasses =
            List.of(
                new CreateActivityRequest.TargetClassData(
                    classId,
                    "BSCS 1A",
                    "BSCS-1A"
                )
            );

        // STEP 3: CREATE THE ASSESSMENT
        CreateActivityRequest request =
            new CreateActivityRequest(
                "Session Lifecycle Integration Test",
                "EXAM",
                "Object-Oriented Programming",
                "OOP101",
                new BigDecimal("75"),
                questions,
                targetClasses
            );

        Long activityId = activityService.createDraft(
            request,
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

        // STEP 5: FACULTY STARTS THE EXAMINATION
        ActivitySessionResponse startedSession =
            activitySessionService.startSession(
                activityId,
                facultyId
            );

        assertEquals("in_progress", startedSession.status());

        Long sessionId = startedSession.id();

        // STEP 6: STUDENT STARTS AN ATTEMPT
        Long studentAnswerId = studentAnswerService.startAttempt(
            sessionId,
            studentId,
            List.of(classId)
        );

        assertNotNull(studentAnswerId);
        assertTrue(studentAnswerId > 0);

        // STEP 7: STUDENT SAVES ANSWERS WITHOUT SUBMITTING
        SaveAnswersRequest saveRequest =
            new SaveAnswersRequest(
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
                    )
                )
            );

        studentAnswerService.saveAnswers(
            sessionId,
            studentId,
            List.of(classId),
            saveRequest
        );

        // VERIFY THAT THE ATTEMPT IS STILL IN PROGRESS
        String beforeEnding =
            jdbcTemplate.queryForObject(
                """
                SELECT submission_status
                FROM student_answers
                WHERE id = ?
                """,
                String.class,
                studentAnswerId
            );

        assertEquals("in_progress", beforeEnding);

        // STEP 8: FACULTY MANUALLY ENDS THE EXAMINATION
        ActivitySessionResponse endedSession =
            activitySessionService.endSession(
                sessionId,
                facultyId
            );

        assertEquals(
            "ended_by_faculty",
            endedSession.status()
        );

        // STEP 9: VERIFY AUTOMATIC SUBMISSION
        String submissionStatus =
            jdbcTemplate.queryForObject(
                """
                SELECT submission_status
                FROM student_answers
                WHERE id = ?
                """,
                String.class,
                studentAnswerId
            );

        assertEquals("auto_submitted", submissionStatus);

        // STEP 10: VERIFY AUTOMATIC OBJECTIVE SCORING
        String gradingStatus =
            jdbcTemplate.queryForObject(
                """
                SELECT grading_status
                FROM student_answers
                WHERE id = ?
                """,
                String.class,
                studentAnswerId
            );

        assertEquals("graded", gradingStatus);

        BigDecimal objectiveScore =
            jdbcTemplate.queryForObject(
                """
                SELECT objective_score
                FROM student_answers
                WHERE id = ?
                """,
                BigDecimal.class,
                studentAnswerId
            );

        assertEquals(
            0,
            objectiveScore.compareTo(new BigDecimal("5"))
        );

        BigDecimal finalScore =
            jdbcTemplate.queryForObject(
                """
                SELECT score
                FROM student_answers
                WHERE id = ?
                """,
                BigDecimal.class,
                studentAnswerId
            );

        assertEquals(
            0,
            finalScore.compareTo(new BigDecimal("5"))
        );

        BigDecimal gradePercent =
            jdbcTemplate.queryForObject(
                """
                SELECT grade_percent
                FROM student_answers
                WHERE id = ?
                """,
                BigDecimal.class,
                studentAnswerId
            );

        assertEquals(
            0,
            gradePercent.compareTo(new BigDecimal("100"))
        );

        Boolean isPassed =
            jdbcTemplate.queryForObject(
                """
                SELECT is_passed
                FROM student_answers
                WHERE id = ?
                """,
                Boolean.class,
                studentAnswerId
            );

        assertEquals(Boolean.TRUE, isPassed);

        // STEP 11: VERIFY STUDENT CANNOT SAVE AFTER SESSION ENDS
        IllegalArgumentException exception =
            assertThrows(
                IllegalArgumentException.class,
                () -> studentAnswerService.saveAnswers(
                    sessionId,
                    studentId,
                    List.of(classId),
                    saveRequest
                )
            );

        assertEquals(
            "This examination session is not currently active.",
            exception.getMessage()
        );

        System.out.println(
            "MYSQL_SESSION_LIFECYCLE_TEST_SUCCESS"
                + " | ACTIVITY ID: " + activityId
                + " | SESSION ID: " + sessionId
                + " | STUDENT ANSWER ID: " + studentAnswerId
                + " | SUBMISSION: AUTO-SUBMITTED"
                + " | FINAL SCORE: 5/5"
                + " | POST-SESSION EDITING: BLOCKED"
        );
    }
}