package com.block_a.edu_meet.quizexam.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class EssayGradingRepository {

    private final JdbcTemplate jdbcTemplate;

    public EssayGradingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // FIND ALL SUBMITTED ATTEMPTS FOR AN ASSESSMENT
    // Only the Professor who owns the assessment can retrieve them.
    public List<Map<String, Object>> findSubmissionsForActivity(
            Long activityId,
            Integer facultyId
    ) {

        String sql = """
            SELECT
                sa.id AS student_answer_id,
                sa.activity_id,
                sa.session_id,
                sa.student_id,
                sa.answer,
                sa.submission_status,
                sa.grading_status,
                sa.objective_score,
                sa.max_score,
                a.name AS activity_name,
                a.question_and_answer,
                a.passing_grade_percent
            FROM student_answers sa
            JOIN activities a
                ON a.id = sa.activity_id
            WHERE a.id = ?
              AND a.faculty_id = ?
              AND sa.submission_status IN ('submitted', 'auto_submitted')
            ORDER BY sa.submitted_at ASC, sa.id ASC
            """;

        return jdbcTemplate.queryForList(
            sql,
            activityId,
            facultyId
        );
    }

    // FIND ONE SUBMITTED ATTEMPT OWNED BY THE PROFESSOR
    public Optional<Map<String, Object>> findSubmissionByIdAndFaculty(
            Long studentAnswerId,
            Integer facultyId
    ) {

        String sql = """
            SELECT
                sa.id AS student_answer_id,
                sa.activity_id,
                sa.session_id,
                sa.student_id,
                sa.answer,
                sa.submission_status,
                sa.grading_status,
                sa.objective_score,
                sa.essay_score,
                sa.score,
                sa.max_score,
                a.name AS activity_name,
                a.question_and_answer,
                a.passing_grade_percent
            FROM student_answers sa
            JOIN activities a
                ON a.id = sa.activity_id
            WHERE sa.id = ?
              AND a.faculty_id = ?
              AND sa.submission_status IN ('submitted', 'auto_submitted')
            """;

        List<Map<String, Object>> results =
            jdbcTemplate.queryForList(
                sql,
                studentAnswerId,
                facultyId
            );

        return results.stream().findFirst();
    }

    // FIND EXISTING ESSAY GRADES
    public List<Map<String, Object>> findGradesByStudentAnswerId(
            Long studentAnswerId
    ) {

        String sql = """
            SELECT
                question_id,
                max_points,
                points_awarded,
                feedback,
                graded_by_faculty_id,
                graded_at
            FROM essay_grades
            WHERE student_answer_id = ?
            ORDER BY question_id
            """;

        return jdbcTemplate.queryForList(
            sql,
            studentAnswerId
        );
    }

    // INSERT OR UPDATE AN ESSAY GRADE
    // MySQL uses ON DUPLICATE KEY UPDATE instead of PostgreSQL ON CONFLICT.
    public int saveEssayGrade(
            Long studentAnswerId,
            String questionId,
            BigDecimal maxPoints,
            BigDecimal pointsAwarded,
            String feedback,
            Integer facultyId
    ) {

        String sql = """
            INSERT INTO essay_grades (
                student_answer_id,
                question_id,
                max_points,
                points_awarded,
                feedback,
                graded_by_faculty_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                max_points = ?,
                points_awarded = ?,
                feedback = ?,
                graded_by_faculty_id = ?,
                graded_at = CURRENT_TIMESTAMP(6)
            """;

        return jdbcTemplate.update(
            sql,
            studentAnswerId,
            questionId,
            maxPoints,
            pointsAwarded,
            feedback,
            facultyId,
            maxPoints,
            pointsAwarded,
            feedback,
            facultyId
        );
    }

    // UPDATE THE STUDENT'S COMBINED OBJECTIVE AND ESSAY SCORES
    public int updateStudentScores(
            Long studentAnswerId,
            BigDecimal essayScore,
            BigDecimal totalScore,
            BigDecimal maxScore,
            BigDecimal gradePercent,
            Boolean isPassed,
            String gradingStatus,
            boolean fullyGraded
    ) {

        String sql = """
            UPDATE student_answers
            SET
                essay_score = ?,
                score = ?,
                max_score = ?,
                grade_percent = ?,
                is_passed = ?,
                grading_status = ?,
                graded_at = CASE
                    WHEN ? THEN CURRENT_TIMESTAMP(6)
                    ELSE NULL
                END,
                last_saved_at = CURRENT_TIMESTAMP(6)
            WHERE id = ?
              AND submission_status IN ('submitted', 'auto_submitted')
            """;

        return jdbcTemplate.update(
            sql,
            essayScore,
            totalScore,
            maxScore,
            gradePercent,
            isPassed,
            gradingStatus,
            fullyGraded,
            studentAnswerId
        );
    }
}
