
package com.block_a.edu_meet.quizexam.controller;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;
import com.block_a.edu_meet.quizexam.service.ActivitySessionService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
public class ActivitySessionController {

    private final ActivitySessionService sessionService;

    public ActivitySessionController(
            ActivitySessionService sessionService
    ) {
        this.sessionService = sessionService;
    }

    @PostMapping("/api/quizexam/activities/{activityId}/sessions/start")
    public ResponseEntity<ActivitySessionResponse> startSession(
            @PathVariable Long activityId,
            HttpServletRequest request
    ) {
        Integer facultyId = requireFacultyId(request);

        ActivitySessionResponse session =
            sessionService.startSession(activityId, facultyId);

        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @PostMapping("/api/quizexam/sessions/{sessionId}/end")
    public ResponseEntity<ActivitySessionResponse> endSession(
            @PathVariable Long sessionId,
            HttpServletRequest request
    ) {
        Integer facultyId = requireFacultyId(request);

        ActivitySessionResponse session =
            sessionService.endSession(sessionId, facultyId);

        return ResponseEntity.ok(session);
    }

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

        if (!Set.of("faculty", "professor").contains(role)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only authorized faculty can control assessment sessions."
            );
        }

        long facultyId = facultyIdNumber.longValue();

        if (facultyId <= 0 || facultyId > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid faculty identity."
            );
        }

        return (int) facultyId;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleValidationError(
            IllegalArgumentException exception
    ) {
        return ResponseEntity.badRequest().body(
            Map.of("error", exception.getMessage())
        );
    }
}
