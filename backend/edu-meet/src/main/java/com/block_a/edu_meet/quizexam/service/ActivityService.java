
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.CreateActivityRequest;
import com.block_a.edu_meet.quizexam.dto.UpdateActivityRequest;
import com.block_a.edu_meet.quizexam.repository.ActivityRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final JsonMapper jsonMapper;

    public ActivityService(
            ActivityRepository activityRepository,
            JsonMapper jsonMapper
    ) {
        this.activityRepository = activityRepository;
        this.jsonMapper = jsonMapper;
    }

    private record PreparedAssessment(
            String name,
            String type,
            String courseName,
            String courseCode,
            BigDecimal passingGradePercent,
            String questionAndAnswerJson,
            List<CreateActivityRequest.TargetClassData> targetClasses
    ) {
    }

    // CREATE A NEW DRAFT ASSESSMENT
    @Transactional
    public Long createDraft(
            CreateActivityRequest request,
            Integer facultyId
    ) {

        if (request == null) {
            throw new IllegalArgumentException(
                "Assessment information is required."
            );
        }

        PreparedAssessment prepared = prepareAssessment(
            request.name(),
            request.type(),
            request.courseName(),
            request.courseCode(),
            request.passingGradePercent(),
            request.questions(),
            request.targetClasses(),
            facultyId
        );

        Long activityId = activityRepository.createDraft(
            prepared.name(),
            prepared.type(),
            prepared.courseName(),
            prepared.courseCode(),
            prepared.passingGradePercent(),
            prepared.questionAndAnswerJson(),
            facultyId
        );

        saveTargetClasses(
            activityId,
            prepared.targetClasses()
        );

        return activityId;
    }

    // UPDATE AN EXISTING DRAFT ASSESSMENT
    @Transactional
    public void updateDraft(
            Long activityId,
            Integer facultyId,
            UpdateActivityRequest request
    ) {

        validateActivityAndFacultyIds(activityId, facultyId);

        if (request == null) {
            throw new IllegalArgumentException(
                "Updated assessment information is required."
            );
        }

        PreparedAssessment prepared = prepareAssessment(
            request.name(),
            request.type(),
            request.courseName(),
            request.courseCode(),
            request.passingGradePercent(),
            request.questions(),
            request.targetClasses(),
            facultyId
        );

        int updated = activityRepository.updateDraft(
            activityId,
            facultyId,
            prepared.name(),
            prepared.type(),
            prepared.courseName(),
            prepared.courseCode(),
            prepared.passingGradePercent(),
            prepared.questionAndAnswerJson()
        );

        if (updated == 0) {
            throw new IllegalArgumentException(
                "Assessment not found, not owned by this faculty member, " +
                "or no longer in draft status."
            );
        }

        // Replace previous target classes.
        activityRepository.deleteTargetClasses(activityId);

        saveTargetClasses(
            activityId,
            prepared.targetClasses()
        );
    }

    // GET ALL ASSESSMENTS FOR A FACULTY MEMBER
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFacultyActivities(
            Integer facultyId
    ) {

        validateFacultyId(facultyId);

        return activityRepository.findAllByFacultyId(facultyId);
    }

    // GET ONE ASSESSMENT OWNED BY A FACULTY MEMBER
    @Transactional(readOnly = true)
    public Map<String, Object> getFacultyActivity(
            Long activityId,
            Integer facultyId
    ) {

        validateActivityAndFacultyIds(activityId, facultyId);

        return activityRepository.findByIdAndFacultyId(
            activityId,
            facultyId
        ).orElseThrow(() -> new IllegalArgumentException(
            "Assessment not found or not owned by this faculty member."
        ));
    }

    // GET TARGET CLASSES FOR AN ASSESSMENT
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActivityTargetClasses(
            Long activityId,
            Integer facultyId
    ) {

        validateActivityAndFacultyIds(activityId, facultyId);

        activityRepository.findByIdAndFacultyId(
            activityId,
            facultyId
        ).orElseThrow(() -> new IllegalArgumentException(
            "Assessment not found or not owned by this faculty member."
        ));

        return activityRepository.findTargetClassesByActivityId(
            activityId
        );
    }

    // UPDATE ASSESSMENT STATUS
    @Transactional
    public void updateActivityStatus(
            Long activityId,
            Integer facultyId,
            String status
    ) {

        validateActivityAndFacultyIds(activityId, facultyId);

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException(
                "Assessment status is required."
            );
        }

        String normalizedStatus =
            status.trim().toLowerCase(Locale.ROOT);

        if (!Set.of("draft", "published", "archived")
                .contains(normalizedStatus)) {

            throw new IllegalArgumentException(
                "Status must be draft, published, or archived."
            );
        }

        int updated = activityRepository.updateStatus(
            activityId,
            facultyId,
            normalizedStatus
        );

        if (updated == 0) {
            throw new IllegalArgumentException(
                "Assessment not found or not owned by this faculty member."
            );
        }
    }

    // VALIDATE AND PREPARE ASSESSMENT INFORMATION
    private PreparedAssessment prepareAssessment(
            String name,
            String type,
            String courseName,
            String courseCode,
            BigDecimal passingGradePercent,
            List<CreateActivityRequest.QuestionData> questions,
            List<CreateActivityRequest.TargetClassData> targetClasses,
            Integer facultyId
    ) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                "Assessment title is required."
            );
        }

        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException(
                "Assessment type is required."
            );
        }

        String normalizedType =
            type.trim().toUpperCase(Locale.ROOT);

        if (!Set.of("QUIZ", "EXAM").contains(normalizedType)) {
            throw new IllegalArgumentException(
                "Assessment type must be QUIZ or EXAM."
            );
        }

        if (courseName == null || courseName.isBlank() ||
            courseCode == null || courseCode.isBlank()) {

            throw new IllegalArgumentException(
                "Course name and course code are required."
            );
        }

        if (passingGradePercent == null ||
            passingGradePercent.compareTo(BigDecimal.ZERO) < 0 ||
            passingGradePercent.compareTo(
                new BigDecimal("100")
            ) > 0) {

            throw new IllegalArgumentException(
                "Passing grade must be between 0 and 100."
            );
        }

        validateFacultyId(facultyId);

        List<CreateActivityRequest.QuestionData> normalizedQuestions =
            normalizeQuestions(questions);

        List<CreateActivityRequest.TargetClassData> normalizedTargets =
            normalizeTargetClasses(targetClasses);

        String questionsJson = serializeQuestions(normalizedQuestions);

        return new PreparedAssessment(
            name.trim(),
            normalizedType,
            courseName.trim(),
            courseCode.trim(),
            passingGradePercent,
            questionsJson,
            normalizedTargets
        );
    }

    // VALIDATE QUESTION TYPES, CONTENT, ANSWERS, AND POINTS
    private List<CreateActivityRequest.QuestionData> normalizeQuestions(
            List<CreateActivityRequest.QuestionData> questions
    ) {

        if (questions == null || questions.isEmpty()) {
            throw new IllegalArgumentException(
                "At least one assessment question is required."
            );
        }

        List<CreateActivityRequest.QuestionData> normalized =
            new ArrayList<>();

        for (int index = 0; index < questions.size(); index++) {

            // Stable question number for validation and lambda expressions.
            final int questionNumber = index + 1;

            CreateActivityRequest.QuestionData question =
                questions.get(index);

            if (question == null) {
                throw new IllegalArgumentException(
                    "Question " + questionNumber + " is invalid."
                );
            }

            if (question.questionText() == null ||
                question.questionText().isBlank()) {

                throw new IllegalArgumentException(
                    "Question " + questionNumber + " needs question text."
                );
            }

            if (question.points() == null ||
                question.points().compareTo(BigDecimal.ZERO) <= 0) {

                throw new IllegalArgumentException(
                    "Question " + questionNumber +
                    " must have points greater than zero."
                );
            }

            String questionType = normalizeQuestionType(
                question.type()
            );

            List<String> options = cleanStringList(
                question.options()
            );

            List<String> acceptedAnswers = cleanStringList(
                question.acceptedAnswers()
            );

            String correctAnswer = cleanOptionalString(
                question.correctAnswer()
            );

            switch (questionType) {

                // MULTIPLE CHOICE
                case "MULTIPLE_CHOICE" -> {

                    if (options.size() < 2) {
                        throw new IllegalArgumentException(
                            "Multiple-choice question " + questionNumber +
                            " must have at least two options."
                        );
                    }

                    Set<String> uniqueOptions = new HashSet<>();

                    for (String option : options) {
                        if (!uniqueOptions.add(
                                option.toLowerCase(Locale.ROOT))) {

                            throw new IllegalArgumentException(
                                "Multiple-choice question " +
                                questionNumber +
                                " contains duplicate options."
                            );
                        }
                    }

                    if (correctAnswer == null) {
                        throw new IllegalArgumentException(
                            "Multiple-choice question " +
                            questionNumber +
                            " needs a correct answer."
                        );
                    }

                    String providedCorrectAnswer = correctAnswer;

                    String matchedOption = options.stream()
                        .filter(option ->
                            option.equalsIgnoreCase(
                                providedCorrectAnswer
                            ))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException(
                            "The correct answer for question " +
                            questionNumber +
                            " must match one of its options."
                        ));

                    correctAnswer = matchedOption;
                    acceptedAnswers = List.of();
                }

                // IDENTIFICATION
                case "IDENTIFICATION" -> {

                    String answerToAdd = correctAnswer;
                    List<String> existingAcceptedAnswers =
                        acceptedAnswers;

                    if (answerToAdd != null &&
                        existingAcceptedAnswers.stream().noneMatch(
                            answer -> answer.equalsIgnoreCase(answerToAdd)
                        )) {

                        acceptedAnswers = new ArrayList<>(
                            existingAcceptedAnswers
                        );

                        acceptedAnswers.add(answerToAdd);
                    }

                    if (acceptedAnswers.isEmpty()) {
                        throw new IllegalArgumentException(
                            "Identification question " + questionNumber +
                            " needs at least one accepted answer."
                        );
                    }

                    options = List.of();
                }

                // TRUE OR FALSE
                case "TRUE_FALSE" -> {

                    if (correctAnswer == null ||
                        (!correctAnswer.equalsIgnoreCase("true") &&
                         !correctAnswer.equalsIgnoreCase("false"))) {

                        throw new IllegalArgumentException(
                            "True/False question " + questionNumber +
                            " must have True or False as its correct answer."
                        );
                    }

                    correctAnswer = correctAnswer.toLowerCase(
                        Locale.ROOT
                    );

                    options = List.of("True", "False");
                    acceptedAnswers = List.of();
                }

                // ESSAY
                case "ESSAY" -> {

                    // Essays are graded manually by the Professor.
                    correctAnswer = null;
                    options = List.of();
                    acceptedAnswers = List.of();
                }

                default -> throw new IllegalArgumentException(
                    "Unsupported question type: " + question.type()
                );
            }

            normalized.add(
                new CreateActivityRequest.QuestionData(
                    questionType,
                    question.questionText().trim(),
                    options,
                    correctAnswer,
                    acceptedAnswers,
                    question.points()
                )
            );
        }

        return normalized;
    }

    // NORMALIZE QUESTION TYPE NAMES
    private String normalizeQuestionType(String type) {

        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException(
                "Every question must have a question type."
            );
        }

        return type.trim()
            .toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
    }

    // REMOVE BLANK VALUES FROM STRING LISTS
    private List<String> cleanStringList(List<String> values) {

        if (values == null) {
            return new ArrayList<>();
        }

        List<String> cleaned = new ArrayList<>();

        for (String value : values) {

            if (value != null && !value.isBlank()) {

                String trimmed = value.trim();

                if (!cleaned.contains(trimmed)) {
                    cleaned.add(trimmed);
                }
            }
        }

        return cleaned;
    }

    // CLEAN AN OPTIONAL STRING
    private String cleanOptionalString(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    // VALIDATE TARGET CLASSES
    private List<CreateActivityRequest.TargetClassData>
    normalizeTargetClasses(
            List<CreateActivityRequest.TargetClassData> targetClasses
    ) {

        if (targetClasses == null || targetClasses.isEmpty()) {
            throw new IllegalArgumentException(
                "At least one target class is required."
            );
        }

        List<CreateActivityRequest.TargetClassData> normalized =
            new ArrayList<>();

        Set<Integer> classIds = new HashSet<>();

        for (CreateActivityRequest.TargetClassData target : targetClasses) {

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

            if (target.className() == null ||
                target.className().isBlank() ||
                target.classCode() == null ||
                target.classCode().isBlank()) {

                throw new IllegalArgumentException(
                    "Every target class needs a class name and class code."
                );
            }

            normalized.add(
                new CreateActivityRequest.TargetClassData(
                    target.classId(),
                    target.className().trim(),
                    target.classCode().trim()
                )
            );
        }

        return normalized;
    }

    // SERIALIZE QUESTIONS INTO JSON
    private String serializeQuestions(
            List<CreateActivityRequest.QuestionData> questions
    ) {

        try {
            return jsonMapper.writeValueAsString(questions);
        } catch (Exception exception) {
            throw new IllegalStateException(
                "Unable to convert assessment questions into JSON.",
                exception
            );
        }
    }

    // SAVE TARGET CLASSES
    private void saveTargetClasses(
            Long activityId,
            List<CreateActivityRequest.TargetClassData> targetClasses
    ) {

        for (CreateActivityRequest.TargetClassData target : targetClasses) {

            activityRepository.addTargetClass(
                activityId,
                target.classId(),
                target.className(),
                target.classCode()
            );
        }
    }

    // VALIDATE FACULTY ID
    private void validateFacultyId(Integer facultyId) {

        if (facultyId == null || facultyId <= 0) {
            throw new IllegalArgumentException(
                "Valid faculty ID is required."
            );
        }
    }

    // VALIDATE ASSESSMENT AND FACULTY IDS
    private void validateActivityAndFacultyIds(
            Long activityId,
            Integer facultyId
    ) {

        if (activityId == null || activityId <= 0) {
            throw new IllegalArgumentException(
                "Valid assessment ID is required."
            );
        }

        validateFacultyId(facultyId);
    }
}
