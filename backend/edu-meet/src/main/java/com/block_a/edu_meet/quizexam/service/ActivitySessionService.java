
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

    public ActivitySessionService(
            ActivityRepository activityRepository,
            ActivitySessionRepository sessionRepository
    ) {
        this.activityRepository = activityRepository;
        this.sessionRepository = sessionRepository;
    }

    // START AN ASSESSMENT SESSION
    @Transactional
    public ActivitySessionResponse startSession(
            Long activityId,
            Integer facultyId
    ) {

        validateIds(activityId, facultyId);

        // Verify that the Professor owns this assessment.
        Map<String, Object> activity =
            activityRepository.findByIdAndFacultyId(
                activityId,
                facultyId
            ).orElseThrow(() -> new IllegalArgumentException(
                "Assessment not found or not owned by this Professor."
            ));

        // Only published assessments can be started.
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

    // END AN ASSESSMENT SESSION
    @Transactional
    public ActivitySessionResponse endSession(
            Long sessionId,
            Integer facultyId
    ) {

        validateIds(sessionId, facultyId);

        return sessionRepository.endSession(
            sessionId,
            facultyId
        );
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
