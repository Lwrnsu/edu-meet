
package com.block_a.edu_meet.quizexam.controller;

import com.block_a.edu_meet.quizexam.dto.ActivityStatusRequest;
import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.UpdateActivityRequest;
import com.block_a.edu_meet.quizexam.service.ActivityService;

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
@RequestMapping("/api/quizexam/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createActivity(
            @RequestBody CreateActivityRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer facultyId = requireFacultyId(httpRequest);

        Long activityId = activityService.createDraft(request, facultyId);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of(
                "message", "Assessment successfully saved as draft.",
                "activityId", activityId,
                "status", "draft"
            ));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getFacultyActivities(
            HttpServletRequest httpRequest
    ) {
        Integer facultyId = requireFacultyId(httpRequest);

        return ResponseEntity.ok(
            activityService.getFacultyActivities(facultyId)
        );
    }

    @GetMapping("/{activityId}")
    public ResponseEntity<Map<String, Object>> getActivity(
            @PathVariable Long activityId,
            HttpServletRequest httpRequest
    ) {
        Integer facultyId = requireFacultyId(httpRequest);

        Map<String, Object> activity =
            activityService.getFacultyActivity(activityId, facultyId);

        List<Map<String, Object>> targetClasses =
            activityService.getActivityTargetClasses(activityId, facultyId);

        return ResponseEntity.ok(Map.of(
            "activity", activity,
            "targetClasses", targetClasses
        ));
    }

    @GetMapping("/{activityId}/classes")
    public ResponseEntity<List<Map<String, Object>>> getActivityClasses(
            @PathVariable Long activityId,
            HttpServletRequest httpRequest
    ) {
        Integer facultyId = requireFacultyId(httpRequest);

        return ResponseEntity.ok(
            activityService.getActivityTargetClasses(activityId, facultyId)
        );
    }

    @PutMapping("/{activityId}")
    public ResponseEntity<Map<String, String>> updateActivity(
            @PathVariable Long activityId,
            @RequestBody UpdateActivityRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer facultyId = requireFacultyId(httpRequest);

        activityService.updateDraft(activityId, facultyId, request);

        return ResponseEntity.ok(Map.of(
            "message", "Draft assessment successfully updated."
        ));
    }

    @PatchMapping("/{activityId}/status")
    public ResponseEntity<Map<String, String>> updateActivityStatus(
            @PathVariable Long activityId,
            @RequestBody ActivityStatusRequest request,
            HttpServletRequest httpRequest
    ) {
        Integer facultyId = requireFacultyId(httpRequest);

        if (request == null || request.status() == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Assessment status is required."
            );
        }

        activityService.updateActivityStatus(
            activityId,
            facultyId,
            request.status()
        );

        return ResponseEntity.ok(Map.of(
            "message", "Assessment status successfully updated.",
            "status", request.status().trim().toLowerCase(Locale.ROOT)
        ));
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
                "Only authorized faculty can manage assessments."
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
