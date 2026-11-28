
package com.block_a.edu_meet;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;

import com.block_a.edu_meet.quizexam.service.ActivityService;
import com.block_a.edu_meet.quizexam.service.ActivitySessionService;
import com.block_a.edu_meet.quizexam.service.StudentAnswerService;
import com.block_a.edu_meet.quizexam.service.StudentScoreHistoryService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class StudentScoreHistoryIntegrationTest {

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ActivitySessionService sessionService;

    @Autowired
    private StudentAnswerService answerService;

    @Autowired
    private StudentScoreHistoryService historyService;

    @Test
    void shouldRetrieveSubmittedAssessmentFromStudentScoreHistory() {

        Integer facultyId = 1;
        Integer studentId = 1;
        Integer classId = 1;

        // CREATE A MULTIPLE-CHOICE ASSESSMENT
        List<CreateActivityRequest.QuestionData> questions = List.of(
            new CreateActivityRequest.QuestionData(
                "MULTIPLE_CHOICE",
                "What is a blueprint for creating objects in Java?",
                List.of("Class", "Object", "Method", "Variable"),
                "Class",
                List.of(),
                new BigDecimal("2")
            )
        );

        List<CreateActivityRequest.TargetClassData> targets = List.of(
            new CreateActivityRequest.TargetClassData(
                classId,
                "BSCS 1A",
                "BSCS-1A"
            )
        );

        CreateActivityRequest request = new CreateActivityRequest(
            "Score History Integration Test",
            "QUIZ",
            "Object-Oriented Programming",
            "OOP101",
            new BigDecimal("70"),
            questions,
            targets
        );

        // CREATE AND PUBLISH ASSESSMENT
        Long activityId = activityService.createDraft(
            request,
            facultyId
        );

        activityService.updateActivityStatus(
            activityId,
            facultyId,
            "published"
        );

        // START EXAMINATION SESSION
        var session = sessionService.startSession(
            activityId,
            facultyId
        );

        // SUBMIT STUDENT ANSWER
        StudentScoreResponse submitted = answerService.submitAnswers(
            new SubmitAnswerRequest(
                session.id(),
                List.of(
                    new SubmitAnswerRequest.AnswerData(0, "Class")
                )
            ),
            studentId,
            List.of(classId)
        );

        assertNotNull(submitted);
        assertEquals("graded", submitted.gradingStatus());

        // RETRIEVE STUDENT'S SCORE HISTORY
        List<StudentScoreResponse> history =
            historyService.getScoreHistory(studentId);

        assertNotNull(history);

        StudentScoreResponse result = history.stream()
            .filter(item -> item.activityId().equals(activityId))
            .findFirst()
            .orElseThrow(() ->
                new AssertionError(
                    "Submitted assessment was not found in student score history."
                )
            );

        // VERIFY ASSESSMENT INFORMATION
        assertEquals("Score History Integration Test", result.activityName());
        assertEquals("Object-Oriented Programming", result.courseName());
        assertEquals("OOP101", result.courseCode());

        // VERIFY SCORES
        assertEquals(
            0,
            result.objectiveScore().compareTo(new BigDecimal("2"))
        );

        assertEquals(
            0,
            result.essayScore().compareTo(BigDecimal.ZERO)
        );

        assertEquals(
            0,
            result.totalScore().compareTo(new BigDecimal("2"))
        );

        assertEquals(
            0,
            result.maxScore().compareTo(new BigDecimal("2"))
        );

        assertEquals(
            0,
            result.gradePercent().compareTo(new BigDecimal("100"))
        );

        assertEquals(Boolean.TRUE, result.isPassed());
        assertEquals("graded", result.gradingStatus());
        assertNotNull(result.submittedAt());

        System.out.println(
            "STUDENT_SCORE_HISTORY_TEST_SUCCESS"
                + " | ACTIVITY ID: " + activityId
                + " | STUDENT ID: " + studentId
                + " | SCORE: 2/2"
        );
    }
}
