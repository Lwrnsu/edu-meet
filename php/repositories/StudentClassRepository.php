<?php

require_once __DIR__ . '../models/ApiResponse.php';

class StudentClassRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getEnrolledClasses(int $studentId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT c.class_id,
                       c.class_name,
                       c.subject_id,
                       s.subject_code,
                       s.subject_name,
                       s.subject_type,
                       c.room,
                       c.schedule_day,
                       c.schedule_time,
                       c.academic_year,
                       b.block_id,
                       b.block_name,
                       b.year_level
                FROM class_student cs
                JOIN class c ON cs.class_id = c.class_id
                JOIN subject s ON c.subject_id = s.subject_id
                LEFT JOIN class_block cb ON c.class_id = cb.class_id
                LEFT JOIN block_student bs
                       ON cb.block_id = bs.block_id AND bs.student_id = cs.student_id
                LEFT JOIN `block` b ON bs.block_id = b.block_id
                WHERE cs.student_id = :student_id
                ORDER BY c.class_name ASC
            ");
            $stmt->execute([':student_id' => $studentId]);

            return new ApiResponse(true, 200, 'Enrolled classes retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve enrolled classes', ['error' => $e->getMessage()]);
        }
    }

    public function getAttendanceRecords(int $studentId, ?int $classId = null): ApiResponse
    {
        try {
            $sql = "
                SELECT ar.attendance_id,
                       COALESCE(ar.class_id, ar.class_id_snapshot) AS class_id,
                       c.class_name,
                       s.subject_code,
                       s.subject_name,
                       ar.attendance_date,
                       ar.status,
                       ar.remarks
                FROM attendance_record ar
                LEFT JOIN class c ON COALESCE(ar.class_id, ar.class_id_snapshot) = c.class_id
                LEFT JOIN subject s ON c.subject_id = s.subject_id
                WHERE ar.student_id = :student_id
            ";
            $params = [':student_id' => $studentId];

            if ($classId !== null) {
                $sql .= " AND ar.class_id_snapshot = :class_id";
                $params[':class_id'] = $classId;
            }

            $sql .= " ORDER BY ar.attendance_date DESC, ar.attendance_id DESC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            return new ApiResponse(true, 200, 'Attendance records retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve attendance records', ['error' => $e->getMessage()]);
        }
    }
}