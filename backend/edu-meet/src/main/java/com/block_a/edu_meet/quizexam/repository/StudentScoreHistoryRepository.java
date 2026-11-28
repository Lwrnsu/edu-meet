
package com.block_a.edu_meet.quizexam.repository;

import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public class StudentScoreHistoryRepository {

    private final JdbcTemplate jdbcTemplate;

    public StudentScoreHistoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // RETRIEVE ALL SUBMITTED ASSESSMENT SCORES FOR A STUDENT
    public List<StudentScoreResponse> findAllByStudentId(Integer studentId) {

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
            WHERE sa.student_id = ?
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
            studentId
        );
    }
}
