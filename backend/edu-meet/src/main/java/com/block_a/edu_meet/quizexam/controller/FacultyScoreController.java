
package com.block_a.edu_meet.quizexam.controller;

import com.block_a.edu_meet.quizexam.dto.FacultyStudentScoreResponse;
import com.block_a.edu_meet.quizexam.service.FacultyScoreService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/quizexam/activities")
public class FacultyScoreController {

    private final FacultyScoreService facultyScoreService;

    public FacultyScoreController(
            FacultyScoreService facultyScoreService
    ) {
        this.facultyScoreService = facultyScoreService;
    }

    // RETRIEVE STUDENT SCORES FOR A FACULTY ASSESSMENT
    @GetMapping("/{activityId}/scores")
    public ResponseEntity<?> getAssessmentScores(
            @PathVariable Long activityId,
            HttpServletRequest request
    ) {

        Object facultyIdAttribute =
            request.getAttribute("authenticatedFacultyId");

        Object roleAttribute =
            request.getAttribute("authenticatedRole");

        // CHECK AUTHENTICATED FACULTY ID
        if (!(facultyIdAttribute instanceof Number facultyIdNumber)
                || roleAttribute == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("Authentication required.");
        }

        long facultyIdValue = facultyIdNumber.longValue();

        if (facultyIdValue <= 0 ||
                facultyIdValue > Integer.MAX_VALUE) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("Invalid faculty identity.");
        }

        // CHECK FACULTY ROLE
        String role = roleAttribute.toString()
            .trim()
            .toLowerCase(Locale.ROOT);

        if (!role.equals("faculty") && !role.equals("professor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("Only faculty members can access assessment scores.");
        }

        // VALIDATE ASSESSMENT ID
        if (activityId == null || activityId <= 0) {
            return ResponseEntity.badRequest()
                .body("Invalid assessment ID.");
        }

        try {
            List<FacultyStudentScoreResponse> scores =
                facultyScoreService.getAssessmentScores(
                    activityId,
                    (int) facultyIdValue
                );

            return ResponseEntity.ok(scores);

        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(exception.getMessage());
        }
    }
}
