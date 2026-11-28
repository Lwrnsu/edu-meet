package com.block_a.edu_meet.quizexam;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;
import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.service.ActivityService;
import com.block_a.edu_meet.quizexam.service.ActivitySessionService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.NONE
)
@Transactional
class ActivityServiceMySqlIntegrationTest {

    private static final Integer FACULTY_ID = 1;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ActivitySessionService activitySessionService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // TEST ASSESSMENT CREATION AND TARGET CLASS SAVING
    @Test
    void shouldCreateAssessmentAndSaveTargetClasses() {

        Long activityId = createTestAssessment(
            "MySQL Integration Test"
        );

        assertTrue(activityId > 0);

        // VERIFY ASSESSMENT RECORD
        Integer assessmentCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM activities
            WHERE id = ?
              AND faculty_id = ?
              AND status = 'draft'
            """,
            Integer.class,
            activityId,
            FACULTY_ID
        );

        assertEquals(1, assessmentCount);

        // VERIFY TARGET CLASS
        Integer targetCount = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM activity_targets
            WHERE activity_id = ?
              AND class_id = 1
            """,
            Integer.class,
            activityId
        );

        assertEquals(1, targetCount);

        // VERIFY ALL FOUR QUESTIONS WERE SAVED AS JSON
        Integer questionCount = jdbcTemplate.queryForObject(
            """
            SELECT JSON_LENGTH(question_and_answer)
            FROM activities
            WHERE id = ?
            """,
            Integer.class,
            activityId
        );

        assertEquals(4, questionCount);

        System.out.println(
            "MYSQL_ASSESSMENT_TEST_SUCCESS: Activity ID = "
                + activityId
        );
    }

    // PREVENT STATUS CHANGES WHILE A SESSION IS ACTIVE
    @Test
    void shouldRejectStatusChangesWhileSessionIsActive() {

        Long activityId = createTestAssessment(
            "Active Session Status Test"
        );

        // PUBLISH THE ASSESSMENT
        activityService.updateActivityStatus(
            activityId,
            FACULTY_ID,
            "published"
        );

        // START AN ASSESSMENT SESSION
        ActivitySessionResponse session =
            activitySessionService.startSession(
                activityId,
                FACULTY_ID
            );

        assertNotNull(session);

        // ARCHIVING MUST BE REJECTED
        assertThrows(
            IllegalArgumentException.class,
            () -> activityService.updateActivityStatus(
                activityId,
                FACULTY_ID,
                "archived"
            )
        );

        // CHANGING BACK TO DRAFT MUST ALSO BE REJECTED
        assertThrows(
            IllegalArgumentException.class,
            () -> activityService.updateActivityStatus(
                activityId,
                FACULTY_ID,
                "draft"
            )
        );

        // VERIFY THAT THE ASSESSMENT REMAINS PUBLISHED
        String currentStatus = jdbcTemplate.queryForObject(
            """
            SELECT status
            FROM activities
            WHERE id = ?
            """,
            String.class,
            activityId
        );

        assertEquals("published", currentStatus);

        System.out.println(
            "MYSQL_ACTIVE_SESSION_STATUS_TEST_SUCCESS: " +
            "Status changes correctly blocked. Session ID = " +
            session.id()
        );
    }

    // ALLOW ARCHIVING AFTER THE FACULTY ENDS THE SESSION
    @Test
    void shouldAllowArchivingAfterSessionEnds() {

        Long activityId = createTestAssessment(
            "Ended Session Archive Test"
        );

        // PUBLISH THE ASSESSMENT
        activityService.updateActivityStatus(
            activityId,
            FACULTY_ID,
            "published"
        );

        // START THE SESSION
        ActivitySessionResponse session =
            activitySessionService.startSession(
                activityId,
                FACULTY_ID
            );

        assertNotNull(session);

        // FACULTY ENDS THE SESSION
        ActivitySessionResponse endedSession =
            activitySessionService.endSession(
                session.id(),
                FACULTY_ID
            );

        assertEquals(
            "ended_by_faculty",
            endedSession.status()
        );

        // ARCHIVING SHOULD NOW BE ALLOWED
        activityService.updateActivityStatus(
            activityId,
            FACULTY_ID,
            "archived"
        );

        // VERIFY FINAL ASSESSMENT STATUS
        String currentStatus = jdbcTemplate.queryForObject(
            """
            SELECT status
            FROM activities
            WHERE id = ?
            """,
            String.class,
            activityId
        );

        assertEquals("archived", currentStatus);

        System.out.println(
            "MYSQL_SESSION_ARCHIVE_TEST_SUCCESS: " +
            "Assessment archived after session ended."
        );
    }

    // REUSABLE TEST ASSESSMENT CREATION
    private Long createTestAssessment(String assessmentName) {

        // CREATE TEST QUESTIONS
        List<CreateActivityRequest.QuestionData> questions = List.of(

            new CreateActivityRequest.QuestionData(
                "MULTIPLE_CHOICE",
                "What is encapsulation?",
                List.of(
                    "Data hiding",
                    "Inheritance",
                    "Polymorphism",
                    "Abstraction"
                ),
                "Data hiding",
                List.of(),
                new BigDecimal("2")
            ),

            new CreateActivityRequest.QuestionData(
                "IDENTIFICATION",
                "What is a blueprint for creating objects?",
                List.of(),
                "Class",
                List.of("Class", "Blueprint"),
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

        // CREATE TARGET CLASS
        List<CreateActivityRequest.TargetClassData> targetClasses =
            List.of(
                new CreateActivityRequest.TargetClassData(
                    1,
                    "BSCS 1A",
                    "BSCS-1A"
                )
            );

        // BUILD ASSESSMENT REQUEST
        CreateActivityRequest request =
            new CreateActivityRequest(
                assessmentName,
                "QUIZ",
                "Object-Oriented Programming",
                "OOP101",
                new BigDecimal("75"),
                questions,
                targetClasses
            );

        // SAVE THROUGH THE SERVICE
        return activityService.createDraft(
            request,
            FACULTY_ID
        );
    }
}