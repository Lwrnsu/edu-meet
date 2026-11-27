<?php

require_once __DIR__ . '/ApiResponse.php';

class FacultyClassRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getAssignedClasses(int $profId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT c.class_id,
                       c.class_name,
                       c.subject_id,
                       s.subject_code,
                       s.subject_name,
                       s.subject_type,
                       c.prof_id,
                       c.room,
                       c.schedule_day,
                       c.schedule_time,
                       c.academic_year
                FROM class c
                JOIN subject s ON c.subject_id = s.subject_id
                WHERE c.prof_id = :prof_id
                ORDER BY c.class_name ASC
            ");
            $stmt->execute([':prof_id' => $profId]);

            return new ApiResponse(true, 200, 'Assigned classes retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve assigned classes', ['error' => $e->getMessage()]);
        }
    }

    public function getClassDetails(int $classId, int $profId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT c.class_id,
                   c.class_name,
                   c.subject_id,
                   s.subject_code,
                   s.subject_name,
                   s.subject_type,
                   c.prof_id,
                   c.room,
                   c.schedule_day,
                   c.schedule_time,
                   c.academic_year
            FROM class c
            JOIN subject s ON c.subject_id = s.subject_id
            WHERE c.class_id = :class_id
              AND c.prof_id = :prof_id
            LIMIT 1
        ");
        $stmt->execute([
            ':class_id' => $classId,
            ':prof_id'  => $profId,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function openClass(int $classId, int $profId): ApiResponse
    {
        try {
            $class = $this->getClassDetails($classId, $profId);
            if (!$class) {
                return new ApiResponse(false, 404, 'Class not found or not assigned to this professor', []);
            }

            return new ApiResponse(true, 200, 'Class opened successfully', $class);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to open class', ['error' => $e->getMessage()]);
        }
    }

    public function getClassRoster(int $classId, int $profId, ?string $attendanceDate = null): ApiResponse
    {
        try {
            if (!$this->getClassDetails($classId, $profId)) {
                return new ApiResponse(false, 403, 'Class not found or not assigned to this professor', []);
            }

            if ($attendanceDate !== null && $attendanceDate !== '') {
                $stmt = $this->db->prepare("
                    SELECT s.student_id,
                           s.user_id,
                           s.student_name,
                           s.email,
                           ar.attendance_id,
                           ar.attendance_date,
                           ar.status,
                           ar.remarks
                    FROM class_student cs
                    JOIN student s ON cs.student_id = s.student_id
                    LEFT JOIN attendance_record ar
                           ON ar.student_id = s.student_id
                          AND ar.class_id_snapshot = cs.class_id
                          AND ar.attendance_date = :attendance_date
                    WHERE cs.class_id = :class_id
                    ORDER BY s.student_name ASC
                ");
                $stmt->execute([
                    ':class_id'        => $classId,
                    ':attendance_date' => $attendanceDate,
                ]);
            } else {
                $stmt = $this->db->prepare("
                    SELECT s.student_id,
                           s.user_id,
                           s.student_name,
                           s.email
                    FROM class_student cs
                    JOIN student s ON cs.student_id = s.student_id
                    WHERE cs.class_id = :class_id
                    ORDER BY s.student_name ASC
                ");
                $stmt->execute([':class_id' => $classId]);
            }

            return new ApiResponse(true, 200, 'Class roster retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve class roster', ['error' => $e->getMessage()]);
        }
    }

    public function saveAttendance(int $classId, int $profId, string $attendanceDate, array $records): ApiResponse
    {
        try {
            if (!$this->getClassDetails($classId, $profId)) {
                return new ApiResponse(false, 403, 'Class not found or not assigned to this professor', []);
            }

            $studentLookup = $this->db->prepare("
                SELECT s.student_id, s.student_name
                FROM class_student cs
                JOIN student s ON cs.student_id = s.student_id
                WHERE cs.class_id = :class_id AND cs.student_id = :student_id
                LIMIT 1
            ");

            $upsert = $this->db->prepare("
                INSERT INTO attendance_record (
                    class_id,
                    student_id,
                    student_name_snapshot,
                    class_id_snapshot,
                    attendance_date,
                    status,
                    remarks
                ) VALUES (
                    :class_id,
                    :student_id,
                    :student_name_snapshot,
                    :class_id_snapshot,
                    :attendance_date,
                    :status,
                    :remarks
                )
                ON DUPLICATE KEY UPDATE
                    class_id = VALUES(class_id),
                    student_name_snapshot = VALUES(student_name_snapshot),
                    status = VALUES(status),
                    remarks = VALUES(remarks)
            ");

            $this->db->beginTransaction();

            $saved = 0;
            foreach ($records as $item) {
                $studentId = (int) $item['student_id'];
                $studentLookup->execute([
                    ':class_id'   => $classId,
                    ':student_id' => $studentId,
                ]);
                $student = $studentLookup->fetch(PDO::FETCH_ASSOC);

                if (!$student) {
                    $this->db->rollBack();
                    return new ApiResponse(false, 400, "Student {$studentId} is not enrolled in class {$classId}", []);
                }

                $upsert->execute([
                    ':class_id'              => $classId,
                    ':student_id'            => $studentId,
                    ':student_name_snapshot' => $student['student_name'],
                    ':class_id_snapshot'     => $classId,
                    ':attendance_date'       => $attendanceDate,
                    ':status'                => $item['status'],
                    ':remarks'               => $item['remarks'] ?? null,
                ]);
                $saved++;
            }

            $this->db->commit();

            return new ApiResponse(true, 200, 'Attendance saved successfully', [
                'class_id'        => $classId,
                'attendance_date' => $attendanceDate,
                'saved_count'     => $saved,
            ]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return new ApiResponse(false, 500, 'Failed to save attendance', ['error' => $e->getMessage()]);
        }
    }
}