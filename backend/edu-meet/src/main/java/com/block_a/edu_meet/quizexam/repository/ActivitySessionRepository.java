package com.block_a.edu_meet.quizexam.repository;

import com.block_a.edu_meet.quizexam.dto.ActivitySessionResponse;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
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
                startedAt == null
                    ? null
                    : startedAt.toLocalDateTime(),
                endedAt == null
                    ? null
                    : endedAt.toLocalDateTime()
            );
        };

    public ActivitySessionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // START AN ASSESSMENT SESSION
    // The database only creates a session for a published activity owned by this
    // faculty member. The unique MySQL key prevents two active sessions at once.
    public ActivitySessionResponse startSession(
            Long activityId,
            Integer facultyId
    ) {

        String sql = """
            INSERT INTO activity_sessions (
                activity_id,
                started_by_faculty_id
            )
            SELECT
                a.id,
                ?
            FROM activities a
            WHERE a.id = ?
              AND a.faculty_id = ?
              AND a.status = 'published'
            """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        try {
            int rowsInserted = jdbcTemplate.update(connection -> {
                PreparedStatement statement = connection.prepareStatement(
                    sql,
                    Statement.RETURN_GENERATED_KEYS
                );

                statement.setInt(1, facultyId);
                statement.setLong(2, activityId);
                statement.setInt(3, facultyId);

                return statement;
            }, keyHolder);

            if (rowsInserted != 1 || keyHolder.getKey() == null) {
                throw new IllegalArgumentException(
                    "Published assessment not found or this faculty member does not own it."
                );
            }
        } catch (DuplicateKeyException exception) {
            throw new IllegalStateException(
                "This assessment already has an active session.",
                exception
            );
        }

        Long sessionId = keyHolder.getKey().longValue();

        return findById(sessionId)
            .orElseThrow(() -> new IllegalStateException(
                "Session was created but could not be retrieved."
            ));
    }

    // END AN ASSESSMENT SESSION
    // Ending the session and auto-submitting unfinished attempts happen in one
    // transaction. The saved student answers are preserved.
    @Transactional
    public ActivitySessionResponse endSession(
            Long sessionId,
            Integer facultyId
    ) {

        String endSessionSql = """
            UPDATE activity_sessions
            SET
                status = 'ended_by_faculty',
                ended_at = CURRENT_TIMESTAMP(6),
                ended_by_faculty_id = ?
            WHERE id = ?
              AND started_by_faculty_id = ?
              AND status = 'in_progress'
            """;

        int sessionsEnded = jdbcTemplate.update(
            endSessionSql,
            facultyId,
            sessionId,
            facultyId
        );

        if (sessionsEnded != 1) {
            throw new IllegalArgumentException(
                "Session could not be ended. It may already be ended, " +
                "inactive, or not owned by this Professor."
            );
        }

        String autoSubmitSql = """
            UPDATE student_answers
            SET
                submission_status = 'auto_submitted',
                submitted_at = (
                    SELECT ended_at
                    FROM activity_sessions
                    WHERE id = ?
                ),
                last_saved_at = LEAST(
                    last_saved_at,
                    (
                        SELECT ended_at
                        FROM activity_sessions
                        WHERE id = ?
                    )
                )
            WHERE session_id = ?
              AND submission_status = 'in_progress'
            """;

        jdbcTemplate.update(
            autoSubmitSql,
            sessionId,
            sessionId,
            sessionId
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
            FROM activity_sessions
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
            FROM activity_sessions
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
}
