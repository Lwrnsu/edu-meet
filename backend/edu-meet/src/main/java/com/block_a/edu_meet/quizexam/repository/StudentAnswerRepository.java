package com.block_a.edu_meet.quizexam.repository;

import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class StudentAnswerRepository {

    private final JdbcTemplate jdbcTemplate;

    public StudentAnswerRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // FIND AN ACTIVE SESSION AND ITS ASSESSMENT
    public Optional<Map<String, Object>> findActiveSessionById(
            Long sessionId
    ) {

        String sql = """
            SELECT
                s.id AS session_id,
                s.activity_id,
                s.status AS session_status
            FROM activity_sessions s
            JOIN activities a
                ON a.id = s.activity_id
            WHERE s.id = ?
              AND s.status = 'in_progress'
              AND a.status = 'published'
            """;

        List<Map<String, Object>> results =
            jdbcTemplate.queryForList(sql, sessionId);

        return results.stream().findFirst();
    }

    // CREATE ONE STUDENT ATTEMPT PER SESSION
    // MySQL uses ON DUPLICATE KEY UPDATE instead of PostgreSQL ON CONFLICT.
    // The unique key on (session_id, student_id) preserves an existing attempt.
    public int createAttemptIfAbsent(
            Long activityId,
            Long sessionId,
            Integer studentId
    ) {

        String sql = """
            INSERT INTO student_answers (
                activity_id,
                session_id,
                student_id
            )
            SELECT
                s.activity_id,
                s.id,
                ?
            FROM activity_sessions s
            JOIN activities a
                ON a.id = s.activity_id
            WHERE s.id = ?
              AND s.activity_id = ?
              AND s.status = 'in_progress'
              AND a.status = 'published'
            ON DUPLICATE KEY UPDATE student_id = student_id
            """;

        return jdbcTemplate.update(
            sql,
            studentId,
            sessionId,
            activityId
        );
    }

    // FIND A STUDENT'S ATTEMPT
    public Optional<Map<String, Object>> findAttempt(
            Long sessionId,
            Integer studentId
    ) {

        String sql = """
            SELECT
                id,
                activity_id,
                session_id,
                student_id,
                submission_status,
                grading_status
            FROM student_answers
            WHERE session_id = ?
              AND student_id = ?
            """;

        List<Map<String, Object>> results =
            jdbcTemplate.queryForList(
                sql,
                sessionId,
                studentId
            );

        return results.stream().findFirst();
    }

    // SAVE OR UPDATE ANSWERS WHILE THE SESSION IS ACTIVE
    // MySQL uses UPDATE ... JOIN rather than PostgreSQL UPDATE ... FROM.
    public int saveAnswers(
            Long sessionId,
            Integer studentId,
            String answersJson
    ) {

        String sql = """
            UPDATE student_answers sa
            JOIN activity_sessions s
                ON sa.session_id = s.id
            SET
                sa.answer = CAST(? AS JSON),
                sa.last_saved_at = CURRENT_TIMESTAMP(6)
            WHERE sa.session_id = ?
              AND sa.student_id = ?
              AND sa.submission_status = 'in_progress'
              AND s.status = 'in_progress'
            """;

        return jdbcTemplate.update(
            sql,
            answersJson,
            sessionId,
            studentId
        );
    }

    // FINALIZE A STUDENT SUBMISSION
    public int submitAnswers(
            Long sessionId,
            Integer studentId,
            String answersJson,
            String gradingStatus,
            java.math.BigDecimal objectiveScore,
            java.math.BigDecimal maxScore,
            java.math.BigDecimal gradePercent,
            Boolean isPassed,
            boolean fullyGraded
    ) {

        String sql = """
            UPDATE student_answers sa
            JOIN activity_sessions s
                ON sa.session_id = s.id
            SET
                sa.answer = CAST(? AS JSON),
                sa.submission_status = 'submitted',
                sa.grading_status = ?,
                sa.objective_score = ?,
                sa.essay_score = 0,
                sa.score = ?,
                sa.max_score = ?,
                sa.grade_percent = ?,
                sa.is_passed = ?,
                sa.submitted_at = CURRENT_TIMESTAMP(6),
                sa.last_saved_at = CURRENT_TIMESTAMP(6),
                sa.graded_at = CASE
                    WHEN ? THEN CURRENT_TIMESTAMP(6)
                    ELSE NULL
                END
            WHERE sa.session_id = ?
              AND sa.student_id = ?
              AND sa.submission_status = 'in_progress'
              AND s.status = 'in_progress'
            """;

        return jdbcTemplate.update(
            sql,
            answersJson,
            gradingStatus,
            objectiveScore,
            objectiveScore,
            maxScore,
            gradePercent,
            isPassed,
            fullyGraded,
            sessionId,
            studentId
        );
    }

    // FIND AUTO-SUBMITTED ANSWERS THAT STILL NEED OBJECTIVE SCORING
    public List<Map<String, Object>> findAutoSubmittedAnswersBySession(
            Long sessionId
    ) {

        String sql = """
            SELECT
                sa.id AS student_answer_id,
                sa.student_id,
                sa.answer,
                a.question_and_answer,
                a.passing_grade_percent
            FROM student_answers sa
            JOIN activities a
                ON a.id = sa.activity_id
            WHERE sa.session_id = ?
              AND sa.submission_status = 'auto_submitted'
              AND sa.grading_status = 'not_graded'
            ORDER BY sa.id
            """;

        return jdbcTemplate.queryForList(sql, sessionId);
    }

    // CALCULATE SCORES FOR AN AUTO-SUBMITTED ATTEMPT
    public int updateAutoSubmittedScore(
            Long studentAnswerId,
            String gradingStatus,
            java.math.BigDecimal objectiveScore,
            java.math.BigDecimal maxScore,
            java.math.BigDecimal gradePercent,
            Boolean isPassed,
            boolean fullyGraded
    ) {

        String sql = """
            UPDATE student_answers
            SET
                grading_status = ?,
                objective_score = ?,
                essay_score = 0,
                score = ?,
                max_score = ?,
                grade_percent = ?,
                is_passed = ?,
                graded_at = CASE
                    WHEN ? THEN CURRENT_TIMESTAMP(6)
                    ELSE NULL
                END,
                last_saved_at = CURRENT_TIMESTAMP(6)
            WHERE id = ?
              AND submission_status = 'auto_submitted'
              AND grading_status = 'not_graded'
            """;

        return jdbcTemplate.update(
            sql,
            gradingStatus,
            objectiveScore,
            objectiveScore,
            maxScore,
            gradePercent,
            isPassed,
            fullyGraded,
            studentAnswerId
        );
    }

    // RETRIEVE A STUDENT'S SCORES
    public Optional<StudentScoreResponse> findStudentScore(
            Long sessionId,
            Integer studentId
    ) {

        String sql = """
            SELECT
                a.id AS activity_id,
                a.name AS activity_name,
                a.type AS activity_type,
                a.course_name,
                a.course_code,
                sa.objective_score,
                sa.essay_score,
                sa.score,
                sa.max_score,
                sa.grade_percent,
                sa.is_passed,
                sa.grading_status,
                sa.submitted_at,
                sa.graded_at
            FROM student_answers sa
            JOIN activities a
                ON a.id = sa.activity_id
            WHERE sa.session_id = ?
              AND sa.student_id = ?
            """;

        List<StudentScoreResponse> results =
            jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) -> {

                    Timestamp submittedAt =
                        resultSet.getTimestamp("submitted_at");

                    Timestamp gradedAt =
                        resultSet.getTimestamp("graded_at");

                    return new StudentScoreResponse(
                        resultSet.getLong("activity_id"),
                        resultSet.getString("activity_name"),
                        resultSet.getString("activity_type"),
                        resultSet.getString("course_name"),
                        resultSet.getString("course_code"),
                        resultSet.getBigDecimal("objective_score"),
                        resultSet.getBigDecimal("essay_score"),
                        resultSet.getBigDecimal("score"),
                        resultSet.getBigDecimal("max_score"),
                        resultSet.getBigDecimal("grade_percent"),
                        resultSet.getObject("is_passed", Boolean.class),
                        resultSet.getString("grading_status"),
                        submittedAt == null
                            ? null
                            : submittedAt.toLocalDateTime(),
                        gradedAt == null
                            ? null
                            : gradedAt.toLocalDateTime()
                    );
                },
                sessionId,
                studentId
            );

        return results.stream().findFirst();
    }
}