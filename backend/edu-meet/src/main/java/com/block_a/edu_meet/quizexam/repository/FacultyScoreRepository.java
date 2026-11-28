
package com.block_a.edu_meet.quizexam.repository;

import com.block_a.edu_meet.quizexam.dto.FacultyStudentScoreResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public class FacultyScoreRepository {

    private final JdbcTemplate jdbcTemplate;

    public FacultyScoreRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // RETRIEVE ALL SUBMITTED STUDENT SCORES FOR A FACULTY ASSESSMENT
    public List<FacultyStudentScoreResponse> findScoresByActivityAndFaculty(
            Long activityId,
            Integer facultyId
    ) {

        String sql = """
            SELECT
                sa.id AS student_answer_id,
                sa.session_id,
                sa.student_id,
                sa.submission_status,
                sa.grading_status,
                sa.objective_score,
                sa.essay_score,
                sa.score AS total_score,
                sa.max_score,
                sa.grade_percent,
                sa.is_passed,
                sa.submitted_at,
                sa.graded_at
            FROM student_answers sa
            JOIN activities a
                ON a.id = sa.activity_id
            WHERE a.id = ?
              AND a.faculty_id = ?
              AND sa.submission_status IN ('submitted', 'auto_submitted')
            ORDER BY sa.submitted_at DESC, sa.id DESC
            """;

        return jdbcTemplate.query(
            sql,
            (resultSet, rowNumber) -> {

                Timestamp submittedAt =
                    resultSet.getTimestamp("submitted_at");

                Timestamp gradedAt =
                    resultSet.getTimestamp("graded_at");

                return new FacultyStudentScoreResponse(
                    resultSet.getLong("student_answer_id"),
                    resultSet.getLong("session_id"),
                    resultSet.getLong("student_id"),
                    resultSet.getString("submission_status"),
                    resultSet.getString("grading_status"),
                    resultSet.getBigDecimal("objective_score"),
                    resultSet.getBigDecimal("essay_score"),
                    resultSet.getBigDecimal("total_score"),
                    resultSet.getBigDecimal("max_score"),
                    resultSet.getBigDecimal("grade_percent"),
                    resultSet.getObject("is_passed", Boolean.class),
                    submittedAt == null
                        ? null
                        : submittedAt.toLocalDateTime(),
                    gradedAt == null
                        ? null
                        : gradedAt.toLocalDateTime()
                );
            },
            activityId,
            facultyId
        );
    }
}
