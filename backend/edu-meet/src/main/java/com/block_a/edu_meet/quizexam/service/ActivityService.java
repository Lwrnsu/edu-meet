package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.repository.ActivityRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;

    public ActivityService(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    // Target class information
    public record TargetClassData(
        Integer classId,
        String className,
        String classCode
    ) {}

    // CREATE A DRAFT WITH ITS TARGET CLASSES
    @Transactional
    public Long createDraft(
            String name,
            String type,
            String courseName,
            String courseCode,
            BigDecimal passingGradePercent,
            String questionAndAnswerJson,
            Integer facultyId,
            List<TargetClassData> targetClasses
    ) {

        // Validate assessment title
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                "Assessment title is required."
            );
        }

        // Validate assessment type
        if (type == null ||
            !Set.of("QUIZ", "EXAM").contains(type.toUpperCase())) {

            throw new IllegalArgumentException(
                "Assessment type must be QUIZ or EXAM."
            );
        }

        // Validate course information
        if (courseName == null || courseName.isBlank() ||
            courseCode == null || courseCode.isBlank()) {

            throw new IllegalArgumentException(
                "Course name and course code are required."
            );
        }

        // Validate passing grade
        if (passingGradePercent == null ||
            passingGradePercent.compareTo(BigDecimal.ZERO) < 0 ||
            passingGradePercent.compareTo(
                new BigDecimal("100")
            ) > 0) {

            throw new IllegalArgumentException(
                "Passing grade must be between 0 and 100."
            );
        }

        // Validate questions
        if (questionAndAnswerJson == null ||
            questionAndAnswerJson.isBlank()) {

            throw new IllegalArgumentException(
                "Assessment questions are required."
            );
        }

        // Validate faculty
        if (facultyId == null || facultyId <= 0) {
            throw new IllegalArgumentException(
                "Valid faculty ID is required."
            );
        }

        // Validate target classes
        if (targetClasses == null || targetClasses.isEmpty()) {
            throw new IllegalArgumentException(
                "At least one target class is required."
            );
        }

        // Prevent duplicate target classes
        Set<Integer> classIds = new HashSet<>();

        for (TargetClassData target : targetClasses) {

            if (target == null ||
                target.classId() == null ||
                target.classId() <= 0) {

                throw new IllegalArgumentException(
                    "Every target class must have a valid class ID."
                );
            }

            if (!classIds.add(target.classId())) {
                throw new IllegalArgumentException(
                    "Duplicate target classes are not allowed."
                );
            }
        }

        // Save the assessment and obtain its generated ID
        Long activityId = activityRepository.createDraft(
            name.trim(),
            type.toUpperCase(),
            courseName.trim(),
            courseCode.trim(),
            passingGradePercent,
            questionAndAnswerJson,
            facultyId
        );

        // Save all assigned target classes
        for (TargetClassData target : targetClasses) {

            activityRepository.addTargetClass(
                activityId,
                target.classId(),
                target.className(),
                target.classCode()
            );
        }

        return activityId;
    }

    // GET ALL ASSESSMENTS FOR A FACULTY MEMBER
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFacultyActivities(
            Integer facultyId
    ) {

        if (facultyId == null || facultyId <= 0) {
            throw new IllegalArgumentException(
                "Valid faculty ID is required."
            );
        }

        return activityRepository.findAllByFacultyId(facultyId);
    }

    // UPDATE ASSESSMENT STATUS
    @Transactional
    public void updateActivityStatus(
            Long activityId,
            Integer facultyId,
            String status
    ) {

        if (activityId == null || activityId <= 0 ||
            facultyId == null || facultyId <= 0) {

            throw new IllegalArgumentException(
                "Valid activity and faculty IDs are required."
            );
        }

        if (status == null ||
            !Set.of("draft", "published", "archived")
                .contains(status.toLowerCase())) {

            throw new IllegalArgumentException(
                "Invalid assessment status."
            );
        }

        int updated = activityRepository.updateStatus(
            activityId,
            facultyId,
            status.toLowerCase()
        );

        if (updated == 0) {
            throw new IllegalArgumentException(
                "Assessment not found or not owned by this faculty."
            );
        }
    }
}