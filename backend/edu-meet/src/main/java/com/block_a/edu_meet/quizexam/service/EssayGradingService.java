
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.EssaySubmissionResponse;
import com.block_a.edu_meet.quizexam.dto.GradeEssayRequest;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;

import com.block_a.edu_meet.quizexam.repository.ActivityRepository;
import com.block_a.edu_meet.quizexam.repository.EssayGradingRepository;
import com.block_a.edu_meet.quizexam.repository.StudentAnswerRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class EssayGradingService {

    private final EssayGradingRepository gradingRepository;
    private final StudentAnswerRepository answerRepository;
    private final ActivityRepository activityRepository;
    private final JsonMapper jsonMapper;

    public EssayGradingService(
            EssayGradingRepository gradingRepository,
            StudentAnswerRepository answerRepository,
            ActivityRepository activityRepository,
            JsonMapper jsonMapper
    ) {
        this.gradingRepository = gradingRepository;
        this.answerRepository = answerRepository;
        this.activityRepository = activityRepository;
        this.jsonMapper = jsonMapper;
    }

    // GET ALL STUDENT ESSAY SUBMISSIONS FOR AN ASSESSMENT
    @Transactional(readOnly = true)
    public List<EssaySubmissionResponse> getEssaySubmissions(
            Long activityId,
            Integer facultyId
    ) {

        validateIds(activityId, facultyId);

        // Verify assessment ownership.
        activityRepository.findByIdAndFacultyId(
            activityId,
            facultyId
        ).orElseThrow(() -> new IllegalArgumentException(
            "Assessment not found or not owned by this Professor."
        ));

        List<Map<String, Object>> submissions =
            gradingRepository.findSubmissionsForActivity(
                activityId,
                facultyId
            );

        List<EssaySubmissionResponse> responses =
            new ArrayList<>();

        for (Map<String, Object> submission : submissions) {

            EssaySubmissionResponse response =
                buildEssaySubmissionResponse(submission);

            if (!response.essays().isEmpty()) {
                responses.add(response);
            }
        }

        return responses;
    }

    // GRADE ONE STUDENT'S ESSAY QUESTIONS
    @Transactional
    public StudentScoreResponse gradeEssays(
            Long studentAnswerId,
            Integer facultyId,
            GradeEssayRequest request
    ) {

        validateIds(studentAnswerId, facultyId);

        if (request == null ||
            request.grades() == null ||
            request.grades().isEmpty()) {

            throw new IllegalArgumentException(
                "At least one essay grade is required."
            );
        }

        // Ensure the attempt belongs to an assessment owned by this Professor.
        Map<String, Object> submission =
            gradingRepository.findSubmissionByIdAndFaculty(
                studentAnswerId,
                facultyId
            ).orElseThrow(() -> new IllegalArgumentException(
                "Student submission not found or not accessible."
            ));

        CreateActivityRequest.QuestionData[] questions =
            readQuestions(submission.get("question_and_answer"));

        Set<Integer> essayQuestionIndexes = new HashSet<>();

        for (int index = 0; index < questions.length; index++) {

            if ("ESSAY".equals(
                    normalizeQuestionType(questions[index].type()))) {

                essayQuestionIndexes.add(index);
            }
        }

        if (essayQuestionIndexes.isEmpty()) {
            throw new IllegalArgumentException(
                "This assessment contains no essay questions."
            );
        }

        // Prevent duplicate grades in the same request.
        Set<Integer> submittedIndexes = new HashSet<>();

        // Validate and save each requested essay grade.
        for (GradeEssayRequest.EssayGradeData grade : request.grades()) {

            if (grade == null || grade.questionIndex() == null) {
                throw new IllegalArgumentException(
                    "Every essay grade must have a question index."
                );
            }

            int index = grade.questionIndex();

            if (!essayQuestionIndexes.contains(index)) {
                throw new IllegalArgumentException(
                    "Question " + index + " is not an essay question."
                );
            }

            if (!submittedIndexes.add(index)) {
                throw new IllegalArgumentException(
                    "Duplicate essay grades are not allowed."
                );
            }

            CreateActivityRequest.QuestionData question =
                questions[index];

            BigDecimal maxPoints = question.points();
            BigDecimal pointsAwarded = grade.pointsAwarded();

            if (pointsAwarded == null ||
                pointsAwarded.compareTo(BigDecimal.ZERO) < 0) {

                throw new IllegalArgumentException(
                    "Essay points awarded cannot be negative or empty."
                );
            }

            if (maxPoints == null ||
                pointsAwarded.compareTo(maxPoints) > 0) {

                throw new IllegalArgumentException(
                    "Essay points awarded cannot exceed the question's maximum points."
                );
            }

            String feedback = grade.feedback();

            if (feedback != null && feedback.isBlank()) {
                feedback = null;
            } else if (feedback != null) {
                feedback = feedback.trim();
            }

            gradingRepository.saveEssayGrade(
                studentAnswerId,
                String.valueOf(index),
                maxPoints,
                pointsAwarded,
                feedback,
                facultyId
            );
        }

        // Retrieve all grades, including grades saved previously.
        List<Map<String, Object>> savedGrades =
            gradingRepository.findGradesByStudentAnswerId(
                studentAnswerId
            );

        Map<String, BigDecimal> pointsByQuestion =
            new HashMap<>();

        BigDecimal essayScore = BigDecimal.ZERO;

        for (Map<String, Object> savedGrade : savedGrades) {

            String questionId =
                String.valueOf(savedGrade.get("question_id"));

            BigDecimal pointsAwarded =
                getBigDecimal(savedGrade.get("points_awarded"));

            pointsByQuestion.put(questionId, pointsAwarded);
        }

        // Sum only grades belonging to the essay questions in this assessment.
        for (Integer index : essayQuestionIndexes) {

            BigDecimal awarded =
                pointsByQuestion.get(String.valueOf(index));

            if (awarded != null) {
                essayScore = essayScore.add(awarded);
            }
        }

        boolean fullyGraded = essayQuestionIndexes.stream()
            .allMatch(index ->
                pointsByQuestion.containsKey(String.valueOf(index))
            );

        BigDecimal objectiveScore =
            getBigDecimal(submission.get("objective_score"));

        BigDecimal maxScore =
            getBigDecimal(submission.get("max_score"));

        BigDecimal totalScore =
            objectiveScore.add(essayScore);

        if (maxScore.compareTo(BigDecimal.ZERO) <= 0 ||
            totalScore.compareTo(maxScore) > 0) {

            throw new IllegalStateException(
                "Calculated score is outside the assessment's valid score range."
            );
        }

        BigDecimal gradePercent = null;
        Boolean isPassed = null;

        if (fullyGraded) {

            gradePercent = totalScore
                .multiply(new BigDecimal("100"))
                .divide(maxScore, 2, RoundingMode.HALF_UP);

            BigDecimal passingGrade =
                getBigDecimal(submission.get("passing_grade_percent"));

            isPassed =
                gradePercent.compareTo(passingGrade) >= 0;
        }

        String gradingStatus = fullyGraded
            ? "graded"
            : "pending_essay_review";

        int updated = gradingRepository.updateStudentScores(
            studentAnswerId,
            essayScore,
            totalScore,
            maxScore,
            gradePercent,
            isPassed,
            gradingStatus,
            fullyGraded
        );

        if (updated == 0) {
            throw new IllegalStateException(
                "Essay grades were saved, but the student score could not be updated."
            );
        }

        Long sessionId =
            ((Number) submission.get("session_id")).longValue();

        Integer studentId =
            ((Number) submission.get("student_id")).intValue();

        return answerRepository.findStudentScore(
            sessionId,
            studentId
        ).orElseThrow(() -> new IllegalStateException(
            "Updated student score could not be retrieved."
        ));
    }

    // BUILD A PROFESSOR-FACING ESSAY SUBMISSION RESPONSE
    private EssaySubmissionResponse buildEssaySubmissionResponse(
            Map<String, Object> submission
    ) {

        CreateActivityRequest.QuestionData[] questions =
            readQuestions(submission.get("question_and_answer"));

        List<SubmitAnswerRequest.AnswerData> answers =
            readAnswers(submission.get("answer"));

        Map<Integer, String> answersByIndex = new HashMap<>();

        for (SubmitAnswerRequest.AnswerData answer : answers) {

            if (answer.questionIndex() != null) {
                answersByIndex.put(
                    answer.questionIndex(),
                    answer.answer()
                );
            }
        }

        Long studentAnswerId =
            ((Number) submission.get("student_answer_id")).longValue();

        List<Map<String, Object>> savedGrades =
            gradingRepository.findGradesByStudentAnswerId(
                studentAnswerId
            );

        Map<String, Map<String, Object>> gradesByQuestion =
            new HashMap<>();

        for (Map<String, Object> grade : savedGrades) {

            gradesByQuestion.put(
                String.valueOf(grade.get("question_id")),
                grade
            );
        }

        List<EssaySubmissionResponse.EssayQuestionResponse> essays =
            new ArrayList<>();

        for (int index = 0; index < questions.length; index++) {

            CreateActivityRequest.QuestionData question =
                questions[index];

            if (!"ESSAY".equals(
                    normalizeQuestionType(question.type()))) {
                continue;
            }

            Map<String, Object> savedGrade =
                gradesByQuestion.get(String.valueOf(index));

            essays.add(
                new EssaySubmissionResponse.EssayQuestionResponse(
                    index,
                    question.questionText(),
                    answersByIndex.get(index),
                    question.points(),
                    savedGrade == null
                        ? null
                        : getBigDecimal(savedGrade.get("points_awarded")),
                    savedGrade == null
                        ? null
                        : (String) savedGrade.get("feedback"),
                    savedGrade != null
                )
            );
        }

        return new EssaySubmissionResponse(
            studentAnswerId,
            ((Number) submission.get("activity_id")).longValue(),
            ((Number) submission.get("session_id")).longValue(),
            ((Number) submission.get("student_id")).intValue(),
            (String) submission.get("activity_name"),
            (String) submission.get("submission_status"),
            (String) submission.get("grading_status"),
            essays
        );
    }

    // READ QUESTIONS FROM POSTGRESQL JSONB
    private CreateActivityRequest.QuestionData[] readQuestions(
            Object jsonValue
    ) {

        try {
            return jsonMapper.readValue(
                String.valueOf(jsonValue),
                CreateActivityRequest.QuestionData[].class
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                "Unable to read assessment question data.",
                exception
            );
        }
    }

    // READ STUDENT ANSWERS FROM POSTGRESQL JSONB
    private List<SubmitAnswerRequest.AnswerData> readAnswers(
            Object jsonValue
    ) {

        try {
            SubmitAnswerRequest.AnswerData[] answers =
                jsonMapper.readValue(
                    String.valueOf(jsonValue),
                    SubmitAnswerRequest.AnswerData[].class
                );

            return List.of(answers);

        } catch (Exception exception) {
            throw new IllegalStateException(
                "Unable to read student answer data.",
                exception
            );
        }
    }

    // NORMALIZE QUESTION TYPES
    private String normalizeQuestionType(String type) {

        if (type == null || type.isBlank()) {
            throw new IllegalStateException(
                "Assessment contains a question without a type."
            );
        }

        return type.trim()
            .toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
    }

    // CONVERT DATABASE NUMERIC VALUES
    private BigDecimal getBigDecimal(Object value) {

        if (value instanceof BigDecimal decimal) {
            return decimal;
        }

        if (value instanceof Number number) {
            return new BigDecimal(number.toString());
        }

        if (value == null) {
            throw new IllegalStateException(
                "Required scoring information is missing."
            );
        }

        return new BigDecimal(value.toString());
    }

    // VALIDATE ASSESSMENT AND PROFESSOR IDS
    private void validateIds(
            Long id,
            Integer facultyId
    ) {

        if (id == null || id <= 0) {
            throw new IllegalArgumentException(
                "A valid assessment or student answer ID is required."
            );
        }

        if (facultyId == null || facultyId <= 0) {
            throw new IllegalArgumentException(
                "A valid Professor ID is required."
            );
        }
    }
}
