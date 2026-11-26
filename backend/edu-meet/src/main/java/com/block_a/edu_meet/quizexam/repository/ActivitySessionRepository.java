package com.block_a.edu_meet.quizexam.repository;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCallback;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class ActivitySessionRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<ActivitySessionResponse> sessionRowMapper =
        (resultSet, rowNumber) -> {

            Timestamp startedAt = resultSet.getTimestamp("started_at");
            Timestamp endedAt = resultSet.getTimestamp("ended_at");

            return new ActivitySessionResponse(
                resultSet.getLong("id"),
                resultSet.getLong("activity_id"),
                resultSet.getString("status"),
                startedAt == null ? null : startedAt.toLocalDateTime(),
                endedAt == null ? null : endedAt.toLocalDateTime()
            );
        };

    public ActivitySessionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // START AN ASSESSMENT SESSION
    public ActivitySessionResponse startSession(
            Long activityId,
            Integer facultyId
    ) {

        executeSessionFunction(
            "SELECT public.start_activity_session(?, ?)",
            activityId,
            facultyId
        );

        return findActiveSessionByActivityId(activityId)
            .orElseThrow(() -> new IllegalStateException(
                "Session was started but could not be retrieved."
            ));
    }

    // END AN ASSESSMENT SESSION
    public ActivitySessionResponse endSession(
            Long sessionId,
            Integer facultyId
    ) {

        executeSessionFunction(
            "SELECT public.end_activity_session(?, ?)",
            sessionId,
            facultyId
        );

        return findById(sessionId)
            .orElseThrow(() -> new IllegalStateException(
                "Ended session could not be retrieved."
            ));
    }

    // FIND THE ACTIVE SESSION FOR AN ASSESSMENT
    public Optional<ActivitySessionResponse> findActiveSessionByActivityId(
            Long activityId
    ) {

        String sql = """
            SELECT
                id,
                activity_id,
                status,
                started_at,
                ended_at
            FROM public.activity_sessions
            WHERE activity_id = ?
              AND status = 'in_progress'
            ORDER BY started_at DESC
            LIMIT 1
            """;

        List<ActivitySessionResponse> results =
            jdbcTemplate.query(
                sql,
                sessionRowMapper,
                activityId
            );

        return results.stream().findFirst();
    }

    // FIND A SESSION BY ITS ID
    public Optional<ActivitySessionResponse> findById(
            Long sessionId
    ) {

        String sql = """
            SELECT
                id,
                activity_id,
                status,
                started_at,
                ended_at
            FROM public.activity_sessions
            WHERE id = ?
            """;

        List<ActivitySessionResponse> results =
            jdbcTemplate.query(
                sql,
                sessionRowMapper,
                sessionId
            );

        return results.stream().findFirst();
    }

    // EXECUTE A POSTGRESQL SESSION FUNCTION
    private void executeSessionFunction(
            String sql,
            Long id,
            Integer facultyId
    ) {

        jdbcTemplate.execute(
            sql,
            (PreparedStatementCallback<Void>) statement -> {

                statement.setLong(1, id);
                statement.setInt(2, facultyId);

                // The function return value is intentionally ignored.
                statement.execute();

                return null;
            }
        );
    }
}