package com.block_a.edu_meet.repository;

import com.block_a.edu_meet.room.RoomTarget;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.function.Supplier;

@Repository
public class PhpClassRepository {

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
                ORDER BY c.name, b.name
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
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Canonical class membership database is unavailable");
        }
    }
}
