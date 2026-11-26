
package com.block_a.edu_meet.quizexam.controller;

import com.block_a.edu_meet.quizexam.dto.EssaySubmissionResponse;
import com.block_a.edu_meet.quizexam.dto.GradeEssayRequest;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;

import com.block_a.edu_meet.quizexam.service.EssayGradingService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/quizexam")
public class EssayGradingController {

    private final EssayGradingService gradingService;

    public EssayGradingController(EssayGradingService gradingService) {
        this.gradingService = gradingService;
    }

    // VIEW ESSAY SUBMISSIONS FOR AN ASSESSMENT
    @GetMapping("/activities/{activityId}/essay-submissions")
    public ResponseEntity<List<EssaySubmissionResponse>> getEssaySubmissions(
            @PathVariable Long activityId,
            HttpServletRequest request
    ) {

        Integer facultyId = requireFacultyId(request);

        List<EssaySubmissionResponse> submissions =
            gradingService.getEssaySubmissions(
                activityId,
                facultyId
            );

        return ResponseEntity.ok(submissions);
    }

    // GRADE ESSAY QUESTIONS FOR ONE STUDENT
    @PutMapping("/student-answers/{studentAnswerId}/essay-grades")
    public ResponseEntity<StudentScoreResponse> gradeEssays(
            @PathVariable Long studentAnswerId,
            @RequestBody GradeEssayRequest requestBody,
            HttpServletRequest request
    ) {

        Integer facultyId = requireFacultyId(request);

        StudentScoreResponse result =
            gradingService.gradeEssays(
                studentAnswerId,
                facultyId,
                requestBody
            );

        return ResponseEntity.ok(result);
    }

    // REQUIRE AN AUTHENTICATED PROFESSOR
    private Integer requireFacultyId(HttpServletRequest request) {

        Object facultyIdAttribute =
            request.getAttribute("authenticatedFacultyId");

        Object roleAttribute =
            request.getAttribute("authenticatedRole");

        if (!(facultyIdAttribute instanceof Number facultyIdNumber) ||
            roleAttribute == null) {

            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Authentication is required."
            );
        }

        String role = roleAttribute.toString()
            .trim()
            .toLowerCase(Locale.ROOT);

        if (role.startsWith("role_")) {
            role = role.substring(5);
        }

        if (!Set.of("faculty", "professor").contains(role)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only authorized Professors can grade essays."
            );
        }

        long facultyId = facultyIdNumber.longValue();

        if (facultyId <= 0 || facultyId > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid Professor identity."
            );
        }

        return (int) facultyId;
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
