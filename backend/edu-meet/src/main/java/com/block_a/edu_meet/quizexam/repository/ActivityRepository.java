package com.block_a.edu_meet.quizexam.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ActivityRepository {

    private final JdbcTemplate jdbcTemplate;

    public ActivityRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // CREATE A NEW DRAFT ASSESSMENT
    // MySQL does not use PostgreSQL's RETURNING clause. Retrieve the generated key
    // through JDBC's generated-keys support instead.
    public Long createDraft(
            String name,
            String type,
            String courseName,
            String courseCode,
            BigDecimal passingGradePercent,
            String questionAndAnswerJson,
            Integer facultyId
    ) {

        String sql = """
            INSERT INTO activities (
                name,
                type,
                course_name,
                course_code,
                passing_grade_percent,
                question_and_answer,
                faculty_id,
                status
            )
            VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, 'draft')
            """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        int rowsInserted = jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                sql,
                Statement.RETURN_GENERATED_KEYS
            );

            statement.setString(1, name);
            statement.setString(2, type);
            statement.setString(3, courseName);
            statement.setString(4, courseCode);
            statement.setBigDecimal(5, passingGradePercent);
            statement.setString(6, questionAndAnswerJson);
            statement.setInt(7, facultyId);

            return statement;
        }, keyHolder);

        if (rowsInserted != 1 || keyHolder.getKey() == null) {
            throw new IllegalStateException(
                "The database did not return the new assessment ID."
            );
        }

        return keyHolder.getKey().longValue();
    }

    // ADD A TARGET CLASS TO AN ASSESSMENT
    public void addTargetClass(
            Long activityId,
            Integer classId,
            String className,
            String classCode
    ) {

        String sql = """
            INSERT INTO activity_targets (
                activity_id,
                class_id,
                class_name,
                class_code
            )
            VALUES (?, ?, ?, ?)
            """;

        jdbcTemplate.update(
            sql,
            activityId,
            classId,
            className,
            classCode
        );
    }

    // REMOVE ALL TARGET CLASSES FROM AN ASSESSMENT
    public int deleteTargetClasses(Long activityId) {

        String sql = """
            DELETE FROM activity_targets
            WHERE activity_id = ?
            """;

        return jdbcTemplate.update(sql, activityId);
    }

    // RETRIEVE TARGET CLASSES FOR AN ASSESSMENT
    public List<Map<String, Object>> findTargetClassesByActivityId(
            Long activityId
    ) {

        String sql = """
            SELECT
                class_id,
                class_name,
                class_code
            FROM activity_targets
            WHERE activity_id = ?
            ORDER BY class_name ASC
            """;

        return jdbcTemplate.queryForList(sql, activityId);
    }

    // RETRIEVE ALL ASSESSMENTS BELONGING TO A FACULTY MEMBER
    public List<Map<String, Object>> findAllByFacultyId(
            Integer facultyId
    ) {

        String sql = """
            SELECT
                id,
                name,
                type,
                course_name,
                course_code,
                passing_grade_percent,
                question_and_answer,
                faculty_id,
                status,
                created_at,
                updated_at
            FROM activities
            WHERE faculty_id = ?
            ORDER BY created_at DESC
            """;

        return jdbcTemplate.queryForList(sql, facultyId);
    }

    // FIND ONE ASSESSMENT OWNED BY A FACULTY MEMBER
    public Optional<Map<String, Object>> findByIdAndFacultyId(
            Long activityId,
            Integer facultyId
    ) {

        String sql = """
            SELECT
                id,
                name,
                type,
                course_name,
                course_code,
                passing_grade_percent,
                question_and_answer,
                faculty_id,
                status,
                created_at,
                updated_at
            FROM activities
            WHERE id = ?
              AND faculty_id = ?
            """;

        List<Map<String, Object>> results =
            jdbcTemplate.queryForList(
                sql,
                activityId,
                facultyId
            );

        return results.stream().findFirst();
    }

    // UPDATE AN EXISTING DRAFT ASSESSMENT
    // Published and archived assessments cannot be edited through this method.
    public int updateDraft(
            Long activityId,
            Integer facultyId,
            String name,
            String type,
            String courseName,
            String courseCode,
            BigDecimal passingGradePercent,
            String questionAndAnswerJson
    ) {

        String sql = """
            UPDATE activities
            SET
                name = ?,
                type = ?,
                course_name = ?,
                course_code = ?,
                passing_grade_percent = ?,
                question_and_answer = CAST(? AS JSON),
                updated_at = CURRENT_TIMESTAMP(6)
            WHERE id = ?
              AND faculty_id = ?
              AND status = 'draft'
            """;

        return jdbcTemplate.update(
            sql,
            name,
            type,
            courseName,
            courseCode,
            passingGradePercent,
            questionAndAnswerJson,
            activityId,
            facultyId
        );
    }

    // CHECK WHETHER AN ASSESSMENT HAS AN ACTIVE SESSION
    public boolean hasActiveSession(Long activityId) {

        String sql = """
            SELECT EXISTS (
                SELECT 1
                FROM activity_sessions
                WHERE activity_id = ?
                  AND status = 'in_progress'
            )
            """;

        Integer exists = jdbcTemplate.queryForObject(
            sql,
            Integer.class,
            activityId
        );

        return exists != null && exists == 1;
    }

    // UPDATE ASSESSMENT STATUS
    // An assessment cannot be moved to draft or archived while a session is active.
    public int updateStatus(
            Long activityId,
            Integer facultyId,
            String status
    ) {

        String sql = """
            UPDATE activities
            SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP(6)
            WHERE id = ?
              AND faculty_id = ?
              AND (
                  ? = 'published'
                  OR NOT EXISTS (
                      SELECT 1
                      FROM activity_sessions s
                      WHERE s.activity_id = activities.id
                        AND s.status = 'in_progress'
                  )
              )
            """;

        return jdbcTemplate.update(
            sql,
            status,
            activityId,
            facultyId,
            status
        );
    }
}