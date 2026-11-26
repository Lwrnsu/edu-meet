
package com.block_a.edu_meet.quizexam.controller;

import com.block_a.edu_meet.quizexam.dto.SaveAnswersRequest;
import com.block_a.edu_meet.quizexam.dto.StudentAssessmentResponse;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;

import com.block_a.edu_meet.quizexam.service.StudentAnswerService;
import com.block_a.edu_meet.quizexam.service.StudentAssessmentService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/quizexam/student")
public class StudentAssessmentController {

    private final StudentAssessmentService assessmentService;
    private final StudentAnswerService answerService;

    public StudentAssessmentController(
            StudentAssessmentService assessmentService,
            StudentAnswerService answerService
    ) {
        this.assessmentService = assessmentService;
        this.answerService = answerService;
    }

    // STUDENT IDENTITY AND ENROLLED CLASSES
    private record StudentContext(
            Integer studentId,
            List<Integer> enrolledClassIds
    ) {
    }

    // GET ALL PUBLISHED ASSESSMENTS FOR THE STUDENT
    @GetMapping("/assessments")
    public ResponseEntity<List<StudentAssessmentResponse>>
    getAvailableAssessments(
            HttpServletRequest request
    ) {

        StudentContext student = requireStudentContext(request);

        List<StudentAssessmentResponse> assessments =
            assessmentService.getAvailableAssessments(
                student.enrolledClassIds()
            );

        return ResponseEntity.ok(assessments);
    }

    // GET ONE PUBLISHED ASSESSMENT
    @GetMapping("/assessments/{activityId}")
    public ResponseEntity<StudentAssessmentResponse> getAssessment(
            @PathVariable Long activityId,
            HttpServletRequest request
    ) {

        StudentContext student = requireStudentContext(request);

        StudentAssessmentResponse assessment =
            assessmentService.getAssessment(
                activityId,
                student.enrolledClassIds()
            );

        return ResponseEntity.ok(assessment);
    }

    // GET THE CURRENT ACTIVE SESSION OF AN ASSESSMENT
    @GetMapping("/assessments/{activityId}/active-session")
    public ResponseEntity<Map<String, Object>> getActiveSession(
            @PathVariable Long activityId,
            HttpServletRequest request
    ) {

        StudentContext student = requireStudentContext(request);

        // Verify that the assessment is assigned to the student's classes.
        assessmentService.getAssessment(
            activityId,
            student.enrolledClassIds()
        );

        Long sessionId =
            assessmentService.getActiveSessionId(activityId);

        return ResponseEntity.ok(
            Map.of(
                "activityId", activityId,
                "sessionId", sessionId,
                "status", "in_progress"
            )
        );
    }

    // START OR RETRIEVE A STUDENT'S ATTEMPT
    @PostMapping("/sessions/{sessionId}/attempt")
    public ResponseEntity<Map<String, Object>> startAttempt(
            @PathVariable Long sessionId,
            HttpServletRequest request
    ) {

        StudentContext student = requireStudentContext(request);

        Long attemptId = answerService.startAttempt(
            sessionId,
            student.studentId(),
            student.enrolledClassIds()
        );

        return ResponseEntity.ok(
            Map.of(
                "message", "Student attempt is ready.",
                "attemptId", attemptId,
                "sessionId", sessionId,
                "status", "in_progress"
            )
        );
    }

    // SAVE ANSWERS WITHOUT FINAL SUBMISSION
    @PutMapping("/sessions/{sessionId}/answers")
    public ResponseEntity<Map<String, String>> saveAnswers(
            @PathVariable Long sessionId,
            @RequestBody SaveAnswersRequest requestBody,
            HttpServletRequest request
    ) {

        StudentContext student = requireStudentContext(request);

        answerService.saveAnswers(
            sessionId,
            student.studentId(),
            student.enrolledClassIds(),
            requestBody
        );

        return ResponseEntity.ok(
            Map.of(
                "message", "Answers successfully saved."
            )
        );
    }

    // FINAL SUBMISSION AND AUTOMATIC OBJECTIVE SCORING
    @PostMapping("/answers/submit")
    public ResponseEntity<StudentScoreResponse> submitAnswers(
            @RequestBody SubmitAnswerRequest requestBody,
            HttpServletRequest request
    ) {

        StudentContext student = requireStudentContext(request);

        StudentScoreResponse result =
            answerService.submitAnswers(
                requestBody,
                student.studentId(),
                student.enrolledClassIds()
            );

        return ResponseEntity.ok(result);
    }

    // REQUIRE A TRUSTED AUTHENTICATED STUDENT
    private StudentContext requireStudentContext(
            HttpServletRequest request
    ) {

        Object studentIdAttribute =
            request.getAttribute("authenticatedStudentId");

        Object roleAttribute =
            request.getAttribute("authenticatedRole");

        Object classIdsAttribute =
            request.getAttribute("authenticatedClassIds");

        if (!(studentIdAttribute instanceof Number studentIdNumber) ||
            roleAttribute == null ||
            !(classIdsAttribute instanceof Collection<?> rawClassIds)) {

            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Student authentication and enrollment information are required."
            );
        }

        String role = roleAttribute.toString()
            .trim()
            .toLowerCase(Locale.ROOT);

        if (role.startsWith("role_")) {
            role = role.substring(5);
        }

        if (!"student".equals(role)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only authenticated Students can access this resource."
            );
        }

        long studentId = studentIdNumber.longValue();

        if (studentId <= 0 || studentId > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid authenticated Student identity."
            );
        }

        // Convert trusted enrollment information into integer class IDs.
        LinkedHashSet<Integer> uniqueClassIds = new LinkedHashSet<>();

        for (Object value : rawClassIds) {

            if (!(value instanceof Number classIdNumber)) {
                throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid authenticated enrollment information."
                );
            }

            long classId = classIdNumber.longValue();

            if (classId <= 0 || classId > Integer.MAX_VALUE) {
                throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid enrolled class ID."
                );
            }

            uniqueClassIds.add((int) classId);
        }

        return new StudentContext(
            (int) studentId,
            new ArrayList<>(uniqueClassIds)
        );
    }

    // HANDLE VALIDATION ERRORS
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleValidationError(
            IllegalArgumentException exception
    ) {

        return ResponseEntity.badRequest().body(
            Map.of("error", exception.getMessage())
        );
    }
}
