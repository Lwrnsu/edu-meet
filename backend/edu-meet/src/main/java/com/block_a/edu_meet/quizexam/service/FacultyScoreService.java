
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.FacultyStudentScoreResponse;
import com.block_a.edu_meet.quizexam.repository.ActivityRepository;
import com.block_a.edu_meet.quizexam.repository.FacultyScoreRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FacultyScoreService {

    private final FacultyScoreRepository scoreRepository;
    private final ActivityRepository activityRepository;

    public FacultyScoreService(
            FacultyScoreRepository scoreRepository,
            ActivityRepository activityRepository
    ) {
        this.scoreRepository = scoreRepository;
        this.activityRepository = activityRepository;
    }

    // RETRIEVE SCORES FOR AN ASSESSMENT OWNED BY THE FACULTY MEMBER
    @Transactional(readOnly = true)
    public List<FacultyStudentScoreResponse> getAssessmentScores(
            Long activityId,
            Integer facultyId
    ) {

        if (activityId == null || activityId <= 0 ||
            facultyId == null || facultyId <= 0) {
            throw new IllegalArgumentException(
                "Valid assessment and faculty IDs are required."
            );
        }

        activityRepository.findByIdAndFacultyId(
            activityId,
            facultyId
        ).orElseThrow(() -> new IllegalArgumentException(
            "Assessment not found or not owned by this faculty member."
        ));

        return scoreRepository.findScoresByActivityAndFaculty(
            activityId,
            facultyId
        );
    }
}
