
package com.block_a.edu_meet.quizexam.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Repository
public class StudentAssessmentRepository {

    private final JdbcTemplate jdbcTemplate;

    public StudentAssessmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // GET PUBLISHED ASSESSMENTS TARGETED TO ENROLLED CLASSES
    public List<Map<String, Object>> findPublishedByClassIds(
            List<Integer> classIds
    ) {

        if (classIds == null || classIds.isEmpty()) {
            return List.of();
        }

        String placeholders = createPlaceholders(classIds.size());

        String sql = """
            SELECT
                a.id,
                a.name,
                a.type,
                a.course_name,
                a.course_code,
                a.question_and_answer,
                a.created_at
            FROM public.activities a
            WHERE a.status = 'published'
              AND EXISTS (
                  SELECT 1
                  FROM public.activity_targets t
                  WHERE t.activity_id = a.id
                    AND t.class_id IN (%s)
              )
            ORDER BY a.created_at DESC
            """.formatted(placeholders);

        return jdbcTemplate.queryForList(
            sql,
            classIds.toArray()
        );
    }

    // GET ONE PUBLISHED ASSESSMENT FOR AN ENROLLED CLASS
    public List<Map<String, Object>> findPublishedByIdAndClassIds(
            Long activityId,
            List<Integer> classIds
    ) {

        if (classIds == null || classIds.isEmpty()) {
            return List.of();
        }

        String placeholders = createPlaceholders(classIds.size());

        String sql = """
            SELECT
                a.id,
                a.name,
                a.type,
                a.course_name,
                a.course_code,
                a.question_and_answer,
                a.created_at
            FROM public.activities a
            WHERE a.id = ?
              AND a.status = 'published'
              AND EXISTS (
                  SELECT 1
                  FROM public.activity_targets t
                  WHERE t.activity_id = a.id
                    AND t.class_id IN (%s)
              )
            """.formatted(placeholders);

        List<Object> parameters = new ArrayList<>();
        parameters.add(activityId);
        parameters.addAll(classIds);

        return jdbcTemplate.queryForList(
            sql,
            parameters.toArray()
        );
    }

    // FIND THE CURRENTLY ACTIVE SESSION FOR AN ASSESSMENT
    public Long findActiveSessionId(Long activityId) {

        String sql = """
            SELECT id
            FROM public.activity_sessions
            WHERE activity_id = ?
              AND status = 'in_progress'
            ORDER BY started_at DESC
            LIMIT 1
            """;

        List<Long> results = jdbcTemplate.query(
            sql,
            (resultSet, rowNumber) -> resultSet.getLong("id"),
            activityId
        );

        return results.isEmpty() ? null : results.get(0);
    }

    // CREATE SQL PLACEHOLDERS FOR CLASS ID PARAMETERS
    private String createPlaceholders(int count) {

        return String.join(
            ", ",
            Collections.nCopies(count, "?")
        );
    }
}
