
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.SaveAnswersRequest;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.dto.SubmitAnswerRequest;

import com.block_a.edu_meet.quizexam.repository.StudentAnswerRepository;
import com.block_a.edu_meet.quizexam.repository.StudentAssessmentRepository;

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
public class StudentAnswerService {

    private final StudentAnswerRepository answerRepository;
    private final StudentAssessmentRepository assessmentRepository;
    private final JsonMapper jsonMapper;

    public StudentAnswerService(
            StudentAnswerRepository answerRepository,
            StudentAssessmentRepository assessmentRepository,
            JsonMapper jsonMapper
    ) {
        this.answerRepository = answerRepository;
        this.assessmentRepository = assessmentRepository;
        this.jsonMapper = jsonMapper;
    }

    private record ScoreCalculation(
            BigDecimal objectiveScore,
            BigDecimal maxScore,
            BigDecimal gradePercent,
            Boolean isPassed,
            boolean hasEssay
    ) {
    }

    // CREATE OR RETRIEVE A STUDENT'S ACTIVE ATTEMPT
    @Transactional
    public Long startAttempt(
            Long sessionId,
            Integer studentId,
            List<Integer> enrolledClassIds
    ) {

        validateStudentId(studentId);

        Map<String, Object> assessment =
            requireAccessibleAssessment(
                sessionId,
                enrolledClassIds
            );

        Long activityId =
            ((Number) assessment.get("id")).longValue();

        answerRepository.createAttemptIfAbsent(
            activityId,
            sessionId,
            studentId
        );

        Map<String, Object> attempt =
            answerRepository.findAttempt(
                sessionId,
                studentId
            ).orElseThrow(() -> new IllegalArgumentException(
                "Unable to create an attempt. The examination session may have ended."
            ));

        requireInProgressAttempt(attempt);

        return ((Number) attempt.get("id")).longValue();
    }

    // SAVE STUDENT ANSWERS WITHOUT FINAL SUBMISSION
    @Transactional
    public void saveAnswers(
            Long sessionId,
            Integer studentId,
            List<Integer> enrolledClassIds,
            SaveAnswersRequest request
    ) {

        validateStudentId(studentId);

        if (request == null) {
            throw new IllegalArgumentException(
                "Answer information is required."
            );
        }

        Map<String, Object> assessment =
            requireAccessibleAssessment(
                sessionId,
                enrolledClassIds
            );

        CreateActivityRequest.QuestionData[] questions =
            readQuestions(
                assessment.get("question_and_answer")
            );

        List<SubmitAnswerRequest.AnswerData> answers =
            normalizeAnswers(
                request.answers(),
                questions
            );

        ensureAttemptExists(
            sessionId,
            studentId,
            assessment
        );

        String answersJson = serializeAnswers(answers);

        int updated = answerRepository.saveAnswers(
            sessionId,
            studentId,
            answersJson
        );

        if (updated == 0) {
            throw new IllegalArgumentException(
                "Answers could not be saved. The attempt may already be submitted or the session may have ended."
            );
        }
    }

    // FINALIZE STUDENT SUBMISSION AND CALCULATE OBJECTIVE SCORE
    @Transactional
    public StudentScoreResponse submitAnswers(
            SubmitAnswerRequest request,
            Integer studentId,
            List<Integer> enrolledClassIds
    ) {

        validateStudentId(studentId);

        if (request == null || request.sessionId() == null) {
            throw new IllegalArgumentException(
                "A valid examination session is required."
            );
        }

        Long sessionId = request.sessionId();

        Map<String, Object> assessment =
            requireAccessibleAssessment(
                sessionId,
                enrolledClassIds
            );

        CreateActivityRequest.QuestionData[] questions =
            readQuestions(
                assessment.get("question_and_answer")
            );

        List<SubmitAnswerRequest.AnswerData> answers =
            normalizeAnswers(
                request.answers(),
                questions
            );

        ensureAttemptExists(
            sessionId,
            studentId,
            assessment
        );

        BigDecimal passingGrade =
            getBigDecimal(
                assessment.get("passing_grade_percent")
            );

        ScoreCalculation calculation = calculateScore(
            questions,
            answers,
            passingGrade
        );

        String gradingStatus = calculation.hasEssay()
            ? "pending_essay_review"
            : "graded";

        String answersJson = serializeAnswers(answers);

        int updated = answerRepository.submitAnswers(
            sessionId,
            studentId,
            answersJson,
            gradingStatus,
            calculation.objectiveScore(),
            calculation.maxScore(),
            calculation.gradePercent(),
            calculation.isPassed(),
            !calculation.hasEssay()
        );

        if (updated == 0) {
            throw new IllegalArgumentException(
                "Submission failed. Your attempt may already be submitted or the examination session may have ended."
            );
        }

        return answerRepository.findStudentScore(
            sessionId,
            studentId
        ).orElseThrow(() -> new IllegalStateException(
            "Submission was saved but the score could not be retrieved."
        ));
    }

    // SCORE ATTEMPTS AUTOMATICALLY SUBMITTED WHEN A SESSION ENDS
    @Transactional
    public int scoreAutoSubmittedAnswers(Long sessionId) {

        if (sessionId == null || sessionId <= 0) {
            throw new IllegalArgumentException(
                "A valid session ID is required."
            );
        }

        List<Map<String, Object>> attempts =
            answerRepository.findAutoSubmittedAnswersBySession(
                sessionId
            );

        int processed = 0;

        for (Map<String, Object> attempt : attempts) {

            Long studentAnswerId =
                ((Number) attempt.get("student_answer_id")).longValue();

            CreateActivityRequest.QuestionData[] questions =
                readQuestions(
                    attempt.get("question_and_answer")
                );

            List<SubmitAnswerRequest.AnswerData> answers =
                readStoredAnswers(
                    attempt.get("answer")
                );

            BigDecimal passingGrade =
                getBigDecimal(
                    attempt.get("passing_grade_percent")
                );

            ScoreCalculation calculation = calculateScore(
                questions,
                answers,
                passingGrade
            );

            String gradingStatus = calculation.hasEssay()
                ? "pending_essay_review"
                : "graded";

            int updated = answerRepository.updateAutoSubmittedScore(
                studentAnswerId,
                gradingStatus,
                calculation.objectiveScore(),
                calculation.maxScore(),
                calculation.gradePercent(),
                calculation.isPassed(),
                !calculation.hasEssay()
            );

            if (updated > 0) {
                processed++;
            }
        }

        return processed;
    }

    // VERIFY ACTIVE SESSION AND STUDENT CLASS ACCESS
    private Map<String, Object> requireAccessibleAssessment(
            Long sessionId,
            List<Integer> enrolledClassIds
    ) {

        if (sessionId == null || sessionId <= 0) {
            throw new IllegalArgumentException(
                "A valid examination session ID is required."
            );
        }

        List<Integer> validClassIds =
            validateEnrolledClassIds(enrolledClassIds);

        Map<String, Object> activeSession =
            answerRepository.findActiveSessionById(
                sessionId
            ).orElseThrow(() -> new IllegalArgumentException(
                "This examination session is not currently active."
            ));

        Long activityId =
            ((Number) activeSession.get("activity_id")).longValue();

        return assessmentRepository
            .findPublishedByIdAndClassIds(
                activityId,
                validClassIds
            )
            .stream()
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "This assessment is not assigned to your enrolled classes."
            ));
    }

    // CREATE AN ATTEMPT IF IT DOES NOT YET EXIST
    private void ensureAttemptExists(
            Long sessionId,
            Integer studentId,
            Map<String, Object> assessment
    ) {

        Long activityId =
            ((Number) assessment.get("id")).longValue();

        answerRepository.createAttemptIfAbsent(
            activityId,
            sessionId,
            studentId
        );

        Map<String, Object> attempt =
            answerRepository.findAttempt(
                sessionId,
                studentId
            ).orElseThrow(() -> new IllegalArgumentException(
                "Unable to retrieve the student attempt."
            ));

        requireInProgressAttempt(attempt);
    }

    // PREVENT CHANGES AFTER FINAL SUBMISSION
    private void requireInProgressAttempt(
            Map<String, Object> attempt
    ) {

        String submissionStatus =
            String.valueOf(attempt.get("submission_status"));

        if (!"in_progress".equalsIgnoreCase(submissionStatus)) {
            throw new IllegalArgumentException(
                "This attempt has already been submitted and cannot be changed."
            );
        }
    }

    // VALIDATE AND CLEAN STUDENT ANSWERS
    private List<SubmitAnswerRequest.AnswerData> normalizeAnswers(
            List<SubmitAnswerRequest.AnswerData> answers,
            CreateActivityRequest.QuestionData[] questions
    ) {

        List<SubmitAnswerRequest.AnswerData> normalized =
            new ArrayList<>();

        if (answers == null) {
            return normalized;
        }

        Set<Integer> questionIndexes = new HashSet<>();

        for (SubmitAnswerRequest.AnswerData answer : answers) {

            if (answer == null || answer.questionIndex() == null) {
                throw new IllegalArgumentException(
                    "Every submitted answer needs a question index."
                );
            }

            int questionIndex = answer.questionIndex();

            if (questionIndex < 0 || questionIndex >= questions.length) {
                throw new IllegalArgumentException(
                    "An answer contains an invalid question index."
                );
            }

            if (!questionIndexes.add(questionIndex)) {
                throw new IllegalArgumentException(
                    "Duplicate answers for the same question are not allowed."
                );
            }

            CreateActivityRequest.QuestionData question =
                questions[questionIndex];

            String answerText = answer.answer() == null
                ? ""
                : answer.answer().trim();

            String questionType =
                normalizeQuestionType(question.type());

            if (!answerText.isEmpty()) {

                if ("MULTIPLE_CHOICE".equals(questionType)) {

                    boolean validOption =
                        question.options() != null &&
                        question.options().stream().anyMatch(
                            option -> option.equalsIgnoreCase(answerText)
                        );

                    if (!validOption) {
                        throw new IllegalArgumentException(
                            "Answer for multiple-choice question " +
                            (questionIndex + 1) +
                            " does not match an available option."
                        );
                    }
                }

                if ("TRUE_FALSE".equals(questionType) &&
                    !answerText.equalsIgnoreCase("true") &&
                    !answerText.equalsIgnoreCase("false")) {

                    throw new IllegalArgumentException(
                        "True/False answers must be True or False."
                    );
                }
            }

            normalized.add(
                new SubmitAnswerRequest.AnswerData(
                    questionIndex,
                    answerText
                )
            );
        }

        return normalized;
    }

    // CALCULATE OBJECTIVE SCORE AND TOTAL POSSIBLE POINTS
    private ScoreCalculation calculateScore(
            CreateActivityRequest.QuestionData[] questions,
            List<SubmitAnswerRequest.AnswerData> answers,
            BigDecimal passingGrade
    ) {

        Map<Integer, String> answerMap = new HashMap<>();

        for (SubmitAnswerRequest.AnswerData answer : answers) {
            answerMap.put(
                answer.questionIndex(),
                answer.answer()
            );
        }

        BigDecimal objectiveScore = BigDecimal.ZERO;
        BigDecimal maxScore = BigDecimal.ZERO;

        boolean hasEssay = false;

        for (int index = 0; index < questions.length; index++) {

            CreateActivityRequest.QuestionData question =
                questions[index];

            if (question == null ||
                question.points() == null ||
                question.points().compareTo(BigDecimal.ZERO) <= 0) {

                throw new IllegalStateException(
                    "Assessment contains invalid question points."
                );
            }

            BigDecimal points = question.points();

            maxScore = maxScore.add(points);

            String questionType =
                normalizeQuestionType(question.type());

            String studentAnswer = answerMap.get(index);

            if (studentAnswer == null || studentAnswer.isBlank()) {
                if ("ESSAY".equals(questionType)) {
                    hasEssay = true;
                }
                continue;
            }

            switch (questionType) {

                case "MULTIPLE_CHOICE" -> {

                    if (question.correctAnswer() != null &&
                        studentAnswer.equalsIgnoreCase(
                            question.correctAnswer().trim()
                        )) {

                        objectiveScore = objectiveScore.add(points);
                    }
                }

                case "IDENTIFICATION" -> {

                    boolean correct =
                        question.acceptedAnswers() != null &&
                        question.acceptedAnswers().stream().anyMatch(
                            accepted -> accepted != null &&
                                studentAnswer.equalsIgnoreCase(
                                    accepted.trim()
                                )
                        );

                    if (!correct &&
                        question.correctAnswer() != null) {

                        correct = studentAnswer.equalsIgnoreCase(
                            question.correctAnswer().trim()
                        );
                    }

                    if (correct) {
                        objectiveScore = objectiveScore.add(points);
                    }
                }

                case "TRUE_FALSE" -> {

                    if (question.correctAnswer() != null &&
                        studentAnswer.equalsIgnoreCase(
                            question.correctAnswer().trim()
                        )) {

                        objectiveScore = objectiveScore.add(points);
                    }
                }

                case "ESSAY" -> hasEssay = true;

                default -> throw new IllegalStateException(
                    "Unsupported question type: " + question.type()
                );
            }
        }

        if (maxScore.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                "Assessment must have a positive total score."
            );
        }

        // Essay questions must be manually graded before a final percentage
        // and pass/fail result can be calculated.
        if (hasEssay) {
            return new ScoreCalculation(
                objectiveScore,
                maxScore,
                null,
                null,
                true
            );
        }

        BigDecimal gradePercent = objectiveScore
            .multiply(new BigDecimal("100"))
            .divide(maxScore, 2, RoundingMode.HALF_UP);

        Boolean isPassed =
            gradePercent.compareTo(passingGrade) >= 0;

        return new ScoreCalculation(
            objectiveScore,
            maxScore,
            gradePercent,
            isPassed,
            false
        );
    }

    // READ QUESTION DATA FROM POSTGRESQL JSONB
    private CreateActivityRequest.QuestionData[] readQuestions(
            Object jsonValue
    ) {

        try {

            String json = String.valueOf(jsonValue);

            return jsonMapper.readValue(
                json,
                CreateActivityRequest.QuestionData[].class
            );

        } catch (Exception exception) {

            throw new IllegalStateException(
                "Unable to read assessment questions.",
                exception
            );
        }
    }

    // READ PREVIOUSLY SAVED ANSWERS FROM POSTGRESQL JSONB
    private List<SubmitAnswerRequest.AnswerData> readStoredAnswers(
            Object jsonValue
    ) {

        try {

            String json = String.valueOf(jsonValue);

            SubmitAnswerRequest.AnswerData[] answers =
                jsonMapper.readValue(
                    json,
                    SubmitAnswerRequest.AnswerData[].class
                );

            return List.of(answers);

        } catch (Exception exception) {

            throw new IllegalStateException(
                "Unable to read saved student answers.",
                exception
            );
        }
    }

    // CONVERT ANSWERS INTO JSON
    private String serializeAnswers(
            List<SubmitAnswerRequest.AnswerData> answers
    ) {

        try {
            return jsonMapper.writeValueAsString(answers);
        } catch (Exception exception) {
            throw new IllegalStateException(
                "Unable to save student answers as JSON.",
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
                "Assessment passing grade is missing."
            );
        }

        return new BigDecimal(value.toString());
    }

    // VALIDATE STUDENT ID
    private void validateStudentId(Integer studentId) {

        if (studentId == null || studentId <= 0) {
            throw new IllegalArgumentException(
                "A valid student ID is required."
            );
        }
    }

    // VALIDATE ENROLLED CLASS IDS
    private List<Integer> validateEnrolledClassIds(
            List<Integer> enrolledClassIds
    ) {

        if (enrolledClassIds == null || enrolledClassIds.isEmpty()) {
            throw new IllegalArgumentException(
                "No enrolled classes were provided."
            );
        }

        Set<Integer> uniqueIds = new HashSet<>();

        for (Integer classId : enrolledClassIds) {

            if (classId == null || classId <= 0) {
                throw new IllegalArgumentException(
                    "An invalid enrolled class ID was provided."
                );
            }

            uniqueIds.add(classId);
        }

        return new ArrayList<>(uniqueIds);
    }
}
