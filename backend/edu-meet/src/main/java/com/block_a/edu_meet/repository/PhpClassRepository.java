package com.block_a.edu_meet.repository;

import com.block_a.edu_meet.room.RoomTarget;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.function.Supplier;

@Repository
public class PhpClassRepository {

    private static final Logger log = LoggerFactory.getLogger(PhpClassRepository.class);
    private static final String ROOM_TARGET_SQL = """
            SELECT c.id AS class_id,
                   c.name AS subject,
                   b.id AS block_id,
                   CONCAT(p.code, ' ', b.name) AS section,
                   c.faculty_id AS faculty_id,
                   c.department_id AS department_id
            FROM classes c
            INNER JOIN enrollments e ON e.class_id = c.id
            INNER JOIN blocks b ON b.id = e.block_id
            INNER JOIN programs p ON p.id = b.program_id
            WHERE c.id = ? AND b.id = ?
            LIMIT 1
            """;

    private final JdbcTemplate jdbcTemplate;

    public PhpClassRepository(@Qualifier("phpClassJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<RoomTarget> findRoomTarget(int classId, int blockId) {
        return databaseCall(() -> jdbcTemplate.query(
                ROOM_TARGET_SQL,
                statement -> {
                    statement.setInt(1, classId);
                    statement.setInt(2, blockId);
                },
                resultSet -> {
                    if (!resultSet.next()) {
                        return Optional.empty();
                    }
                    return Optional.of(new RoomTarget(
                            resultSet.getInt("class_id"),
                            resultSet.getString("subject"),
                            resultSet.getInt("block_id"),
                            resultSet.getString("section"),
                            resultSet.getInt("faculty_id"),
                            resultSet.getInt("department_id")));
                }));
    }

    public List<RoomTarget> findStudentRoomTargets(int studentId) {
        return findRoomTargets(
                """
                INNER JOIN enrollments e ON e.class_id = c.id
                INNER JOIN blocks b ON b.id = e.block_id
                INNER JOIN programs p ON p.id = b.program_id
                WHERE e.student_id = ?
                """,
                studentId);
    }

    public List<RoomTarget> findFacultyRoomTargets(int facultyId) {
        return findRoomTargets(
                """
                INNER JOIN enrollments e ON e.class_id = c.id
                INNER JOIN blocks b ON b.id = e.block_id
                INNER JOIN programs p ON p.id = b.program_id
                WHERE c.faculty_id = ?
                """,
                facultyId);
    }

    public List<RoomTarget> findDeanRoomTargets(int deanId) {
        return findRoomTargets(
                """
                INNER JOIN enrollments e ON e.class_id = c.id
                INNER JOIN blocks b ON b.id = e.block_id
                INNER JOIN programs p ON p.id = b.program_id
                INNER JOIN deans d ON d.department_id = c.department_id
                WHERE d.id = ?
                """,
                deanId);
    }

    private List<RoomTarget> findRoomTargets(String joinAndFilter, int userId) {
        String sql = """
                SELECT DISTINCT c.id AS class_id,
                       c.name AS subject,
                       b.id AS block_id,
                       CONCAT(p.code, ' ', b.name) AS section,
                       c.faculty_id AS faculty_id,
                       c.department_id AS department_id
                FROM classes c
                %s
                ORDER BY subject, section
                """.formatted(joinAndFilter);
        return databaseCall(() -> jdbcTemplate.query(sql, (resultSet, rowNumber) -> new RoomTarget(
                resultSet.getInt("class_id"),
                resultSet.getString("subject"),
                resultSet.getInt("block_id"),
                resultSet.getString("section"),
                resultSet.getInt("faculty_id"),
                resultSet.getInt("department_id")), userId));
    }

    public boolean isStudentEnrolled(int studentId, int classId, int blockId) {
        Integer matches = databaseCall(() -> jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM enrollments
                WHERE student_id = ? AND class_id = ? AND block_id = ?
                """,
                Integer.class,
                studentId,
                classId,
                blockId));
        return matches != null && matches > 0;
    }

    public OptionalInt findAccountIdByEmail(String email) {
        if (email == null || email.isBlank()) {
            return OptionalInt.empty();
        }

        List<String> primaryKeyColumns = databaseCall(() -> jdbcTemplate.query(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND CONSTRAINT_NAME = 'PRIMARY'
                  AND COLUMN_NAME IN ('user_id', 'id')
                """,
                (resultSet, rowNumber) -> resultSet.getString("COLUMN_NAME")));
        String idColumn = primaryKeyColumns.stream()
                .filter("user_id"::equals)
                .findFirst()
                .orElseGet(() -> primaryKeyColumns.stream()
                        .filter("id"::equals)
                        .findFirst()
                        .orElse(null));
        if (idColumn == null) {
            return OptionalInt.empty();
        }

        List<Integer> ids = databaseCall(() -> jdbcTemplate.query(
                "SELECT " + idColumn + " FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
                (resultSet, rowNumber) -> resultSet.getInt(1),
                email.trim()));
        return ids.isEmpty() ? OptionalInt.empty() : OptionalInt.of(ids.get(0));
    }

    public OptionalInt findDeanDepartmentId(int deanId) {
        List<Integer> departments = databaseCall(() -> jdbcTemplate.query(
                "SELECT department_id FROM deans WHERE id = ? LIMIT 1",
                (resultSet, rowNumber) -> resultSet.getInt("department_id"),
                deanId));
        return departments.isEmpty()
                ? OptionalInt.empty()
                : OptionalInt.of(departments.get(0));
    }

    private <T> T databaseCall(Supplier<T> operation) {
        try {
            return operation.get();
        } catch (DataAccessException exception) {
            log.error("Canonical class membership database operation failed", exception);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Canonical class membership database is unavailable");
        }
    }
}
