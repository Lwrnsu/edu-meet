
package com.block_a.edu_meet.quizexam.controller;

import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.service.StudentScoreHistoryService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/quizexam/student")
public class StudentScoreHistoryController {

    private final StudentScoreHistoryService historyService;

    public StudentScoreHistoryController(
            StudentScoreHistoryService historyService
    ) {
        this.historyService = historyService;
    }

    // GET ALL PREVIOUS ASSESSMENT RESULTS
    @GetMapping("/results")
    public ResponseEntity<List<StudentScoreResponse>> getScoreHistory(
            HttpServletRequest request
    ) {
        Integer studentId = requireStudentId(request);

        return ResponseEntity.ok(
            historyService.getScoreHistory(studentId)
        );
    }

    // REQUIRE AN AUTHENTICATED STUDENT
    private Integer requireStudentId(HttpServletRequest request) {

        Object studentIdAttribute =
            request.getAttribute("authenticatedStudentId");

        Object roleAttribute =
            request.getAttribute("authenticatedRole");

        if (!(studentIdAttribute instanceof Number studentIdNumber) ||
            roleAttribute == null) {

            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Student authentication is required."
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
                "Only students can access their assessment results."
            );
        }

        long studentId = studentIdNumber.longValue();

        if (studentId <= 0 || studentId > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid student identity."
            );
        }

        return (int) studentId;
    }
}
