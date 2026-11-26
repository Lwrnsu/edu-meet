
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;
import com.block_a.edu_meet.quizexam.repository.ActivityRepository;
import com.block_a.edu_meet.quizexam.repository.ActivitySessionRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class ActivitySessionService {

    private final ActivityRepository activityRepository;
    private final ActivitySessionRepository sessionRepository;
    private final StudentAnswerService studentAnswerService;

    public ActivitySessionService(
            ActivityRepository activityRepository,
            ActivitySessionRepository sessionRepository,
            StudentAnswerService studentAnswerService
    ) {
        this.activityRepository = activityRepository;
        this.sessionRepository = sessionRepository;
        this.studentAnswerService = studentAnswerService;
    }

    // START AN ASSESSMENT SESSION
    @Transactional
    public ActivitySessionResponse startSession(
            Long activityId,
            Integer facultyId
    ) {

        validateIds(activityId, facultyId);

        Map<String, Object> activity =
            activityRepository.findByIdAndFacultyId(
                activityId,
                facultyId
            ).orElseThrow(() -> new IllegalArgumentException(
                "Assessment not found or not owned by this Professor."
            ));

        String status = String.valueOf(activity.get("status"));

        if (!"published".equalsIgnoreCase(status)) {
            throw new IllegalArgumentException(
                "Only published assessments can be started."
            );
        }

        return sessionRepository.startSession(
            activityId,
            facultyId
        );
    }

    // END AN ASSESSMENT SESSION AND SCORE AUTO-SUBMITTED ATTEMPTS
    @Transactional
    public ActivitySessionResponse endSession(
            Long sessionId,
            Integer facultyId
    ) {

        validateIds(sessionId, facultyId);

        // The PostgreSQL function ends the session and auto-submits
        // all remaining in-progress student attempts.
        ActivitySessionResponse session =
            sessionRepository.endSession(
                sessionId,
                facultyId
            );

        // Calculate objective scores for those auto-submitted attempts.
        studentAnswerService.scoreAutoSubmittedAnswers(sessionId);

        return session;
    }

    // VALIDATE IDENTIFIERS
    private void validateIds(
            Long id,
            Integer facultyId
    ) {

        if (id == null || id <= 0) {
            throw new IllegalArgumentException(
                "A valid assessment or session ID is required."
            );
        }

        if (facultyId == null || facultyId <= 0) {
            throw new IllegalArgumentException(
                "A valid Professor ID is required."
            );
        }
    }
}
