
package com.block_a.edu_meet.quizexam.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
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
            INSERT INTO public.activities (
                name,
                type,
                course_name,
                course_code,
                passing_grade_percent,
                question_and_answer,
                faculty_id,
                status
            )
            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), ?, 'draft')
            RETURNING id
            """;

        return jdbcTemplate.queryForObject(
            sql,
            Long.class,
            name,
            type,
            courseName,
            courseCode,
            passingGradePercent,
            questionAndAnswerJson,
            facultyId
        );
    }

    // ADD A TARGET CLASS TO AN ASSESSMENT
    public void addTargetClass(
            Long activityId,
            Integer classId,
            String className,
            String classCode
    ) {

        String sql = """
            INSERT INTO public.activity_targets (
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
            DELETE FROM public.activity_targets
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
            FROM public.activity_targets
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
            FROM public.activities
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
            FROM public.activities
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
            UPDATE public.activities
            SET
                name = ?,
                type = ?,
                course_name = ?,
                course_code = ?,
                passing_grade_percent = ?,
                question_and_answer = CAST(? AS jsonb),
                updated_at = CURRENT_TIMESTAMP
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

    // UPDATE ASSESSMENT STATUS
    public int updateStatus(
            Long activityId,
            Integer facultyId,
            String status
    ) {

        String sql = """
            UPDATE public.activities
            SET
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND faculty_id = ?
            """;

        return jdbcTemplate.update(
            sql,
            status,
            activityId,
            facultyId
        );
    }
}
