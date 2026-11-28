
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.StudentAssessmentResponse;
import com.block_a.edu_meet.quizexam.repository.StudentAssessmentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class StudentAssessmentService {

    private final StudentAssessmentRepository assessmentRepository;
    private final JsonMapper jsonMapper;

    public StudentAssessmentService(
            StudentAssessmentRepository assessmentRepository,
            JsonMapper jsonMapper
    ) {
        this.assessmentRepository = assessmentRepository;
        this.jsonMapper = jsonMapper;
    }

    // GET ALL PUBLISHED ASSESSMENTS FOR ENROLLED CLASSES
    @Transactional(readOnly = true)
    public List<StudentAssessmentResponse> getAvailableAssessments(
            List<Integer> enrolledClassIds
    ) {

        List<Integer> validClassIds =
            validateEnrolledClassIds(enrolledClassIds);

        List<Map<String, Object>> assessments =
            assessmentRepository.findPublishedByClassIds(
                validClassIds
            );

        List<StudentAssessmentResponse> responses =
            new ArrayList<>();

        for (Map<String, Object> assessment : assessments) {
            responses.add(toStudentResponse(assessment));
        }

        return responses;
    }

    // GET ONE PUBLISHED ASSESSMENT
    @Transactional(readOnly = true)
    public StudentAssessmentResponse getAssessment(
            Long activityId,
            List<Integer> enrolledClassIds
    ) {

        if (activityId == null || activityId <= 0) {
            throw new IllegalArgumentException(
                "A valid assessment ID is required."
            );
        }

        List<Integer> validClassIds =
            validateEnrolledClassIds(enrolledClassIds);

        Map<String, Object> assessment =
            assessmentRepository.findPublishedByIdAndClassIds(
                activityId,
                validClassIds
            ).stream()
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Assessment not found or not assigned to your enrolled classes."
            ));

        return toStudentResponse(assessment);
    }

    // GET ACTIVE SESSION ID FOR A PUBLISHED ASSESSMENT
    @Transactional(readOnly = true)
    public Long getActiveSessionId(Long activityId) {

        if (activityId == null || activityId <= 0) {
            throw new IllegalArgumentException(
                "A valid assessment ID is required."
            );
        }

        Long sessionId =
            assessmentRepository.findActiveSessionId(activityId);

        if (sessionId == null) {
            throw new IllegalArgumentException(
                "This assessment does not currently have an active session."
            );
        }

        return sessionId;
    }

    // CONVERT DATABASE ASSESSMENT INTO STUDENT-SAFE RESPONSE
    private StudentAssessmentResponse toStudentResponse(
            Map<String, Object> assessment
    ) {

        Long activityId = ((Number) assessment.get("id")).longValue();

        String questionJson = String.valueOf(
            assessment.get("question_and_answer")
        );

        List<StudentAssessmentResponse.QuestionData> safeQuestions =
            convertQuestions(questionJson);

        return new StudentAssessmentResponse(
            activityId,
            (String) assessment.get("name"),
            (String) assessment.get("type"),
            (String) assessment.get("course_name"),
            (String) assessment.get("course_code"),
            safeQuestions
        );
    }

    // REMOVE ALL ANSWER KEYS FROM QUESTIONS
    private List<StudentAssessmentResponse.QuestionData> convertQuestions(
            String questionJson
    ) {

        try {

            CreateActivityRequest.QuestionData[] questions =
                jsonMapper.readValue(
                    questionJson,
                    CreateActivityRequest.QuestionData[].class
                );

            List<StudentAssessmentResponse.QuestionData> safeQuestions =
                new ArrayList<>();

            for (int index = 0; index < questions.length; index++) {

                CreateActivityRequest.QuestionData question =
                    questions[index];

                List<String> safeOptions =
                    question.options() == null
                        ? List.of()
                        : List.copyOf(question.options());

                safeQuestions.add(
                    new StudentAssessmentResponse.QuestionData(
                        index,
                        question.type(),
                        question.questionText(),
                        safeOptions,
                        question.points()
                    )
                );
            }

            return safeQuestions;

        } catch (Exception exception) {

            throw new IllegalStateException(
                "Unable to read assessment question data.",
                exception
            );
        }
    }

    // VALIDATE AND REMOVE DUPLICATE ENROLLED CLASS IDS
    private List<Integer> validateEnrolledClassIds(
            List<Integer> enrolledClassIds
    ) {

        if (enrolledClassIds == null || enrolledClassIds.isEmpty()) {
            throw new IllegalArgumentException(
                "No enrolled classes were provided."
            );
        }

        Set<Integer> uniqueClassIds = new LinkedHashSet<>();

        for (Integer classId : enrolledClassIds) {

            if (classId == null || classId <= 0) {
                throw new IllegalArgumentException(
                    "Invalid enrolled class ID."
                );
            }

            uniqueClassIds.add(classId);
        }

        return new ArrayList<>(uniqueClassIds);
    }
}
