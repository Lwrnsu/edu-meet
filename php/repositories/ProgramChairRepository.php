<?php

require_once __DIR__ . '../models/ApiResponse.php';

class ProgramChairRepository
{
    private PDO $db;
    private int $programId;

    public function __construct(PDO $db, int $programId)
    {
        $this->db        = $db;
        $this->programId = $programId;
    }

    public function getBlocks(): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT block_id, block_name, year_level, program_id
                FROM `block`
                WHERE program_id = :program_id
                ORDER BY year_level ASC, block_name ASC
            ");
            $stmt->execute([':program_id' => $this->programId]);

            return new ApiResponse(true, 200, 'Blocks retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve blocks', ['error' => $e->getMessage()]);
        }
    }

    public function addBlock(string $blockName, int $yearLevel): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO `block` (block_name, year_level, program_id)
                VALUES (:block_name, :year_level, :program_id)
            ");
            $stmt->execute([
                ':block_name' => $blockName,
                ':year_level' => $yearLevel,
                ':program_id' => $this->programId,
            ]);

            return new ApiResponse(true, 201, 'Block created successfully', [
                'block_id'   => (int) $this->db->lastInsertId(),
                'block_name' => $blockName,
                'year_level' => $yearLevel,
                'program_id' => $this->programId,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to create block', ['error' => $e->getMessage()]);
        }
    }

    public function addStudentToBlock(int $blockId, int $studentId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                INSERT IGNORE INTO block_student (block_id, student_id)
                SELECT b.block_id, :student_id
                FROM `block` b
                WHERE b.block_id = :block_id AND b.program_id = :program_id
            ");
            $stmt->execute([
                ':block_id'   => $blockId,
                ':student_id' => $studentId,
                ':program_id' => $this->programId,
            ]);

            if ($stmt->rowCount() === 0) {
                return new ApiResponse(false, 400, 'Unable to add student to block (check block/program)', []);
            }

            return new ApiResponse(true, 201, 'Student added to block', [
                'block_id'   => $blockId,
                'student_id' => $studentId,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to add student to block', ['error' => $e->getMessage()]);
        }
    }

    public function getClasses(): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT DISTINCT
                       c.class_id,
                       c.class_name,
                       c.subject_id,
                       s.subject_code,
                       s.subject_name,
                       s.subject_type,
                       c.prof_id,
                       p.prof_name,
                       c.room,
                       c.schedule_day,
                       c.schedule_time,
                       c.academic_year
                FROM class c
                JOIN subject s ON c.subject_id = s.subject_id
                LEFT JOIN professor p ON c.prof_id = p.prof_id
                LEFT JOIN class_block cb ON c.class_id = cb.class_id
                LEFT JOIN `block` b ON cb.block_id = b.block_id
                WHERE b.program_id = :program_id
                   OR s.department_id = (
                       SELECT department_id FROM program WHERE program_id = :program_id_sub
                   )
                ORDER BY c.class_name ASC
            ");
            $stmt->execute([
                ':program_id'     => $this->programId,
                ':program_id_sub' => $this->programId,
            ]);

            return new ApiResponse(true, 200, 'Classes retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve classes', ['error' => $e->getMessage()]);
        }
    }

    public function addClass(array $data): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO class
                    (class_name, subject_id, prof_id, room, schedule_day, schedule_time, academic_year)
                VALUES
                    (:class_name, :subject_id, :prof_id, :room, :schedule_day, :schedule_time, :academic_year)
            ");
            $stmt->execute([
                ':class_name'    => $data['class_name'],
                ':subject_id'    => $data['subject_id'],
                ':prof_id'       => $data['prof_id'],
                ':room'          => $data['room'] !== '' ? $data['room'] : 'TBA',
                ':schedule_day'  => $data['schedule_day'] !== '' ? $data['schedule_day'] : null,
                ':schedule_time' => $data['schedule_time'] !== '' ? $data['schedule_time'] : null,
                ':academic_year' => $data['academic_year'],
            ]);

            return new ApiResponse(true, 201, 'Class created successfully', [
                'class_id' => (int) $this->db->lastInsertId(),
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to create class', ['error' => $e->getMessage()]);
        }
    }

    public function assignBlockToClass(int $classId, int $blockId): ApiResponse
    {
        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("
                INSERT IGNORE INTO class_block (class_id, block_id)
                SELECT :class_id, b.block_id
                FROM `block` b
                WHERE b.block_id = :block_id AND b.program_id = :program_id
            ");
            $stmt->execute([
                ':class_id'   => $classId,
                ':block_id'   => $blockId,
                ':program_id' => $this->programId,
            ]);

            if ($stmt->rowCount() === 0) {
                $this->db->rollBack();
                return new ApiResponse(false, 404, 'Block not found in this program', []);
            }

            // Enroll students from this block into the class
            $enroll = $this->db->prepare("
                INSERT IGNORE INTO class_student (class_id, student_id)
                SELECT :class_id, bs.student_id
                FROM block_student bs
                WHERE bs.block_id = :block_id
            ");
            $enroll->execute([
                ':class_id' => $classId,
                ':block_id' => $blockId,
            ]);

            $this->db->commit();

            return new ApiResponse(true, 200, 'Block assigned and students enrolled in class', [
                'class_id' => $classId,
                'block_id' => $blockId,
            ]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return new ApiResponse(false, 500, 'Failed to assign block to class', ['error' => $e->getMessage()]);
        }
    }

    public function addStudentToClass(int $classId, int $studentId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                INSERT IGNORE INTO class_student (class_id, student_id)
                VALUES (:class_id, :student_id)
            ");
            $stmt->execute([
                ':class_id'   => $classId,
                ':student_id' => $studentId,
            ]);

            return new ApiResponse(true, 201, 'Student enrolled in class', [
                'class_id'   => $classId,
                'student_id' => $studentId,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to enroll student in class', ['error' => $e->getMessage()]);
        }
    }

    public function removeStudentFromClass(int $classId, int $studentId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM class_student
                WHERE class_id = :class_id AND student_id = :student_id
            ");
            $stmt->execute([
                ':class_id'   => $classId,
                ':student_id' => $studentId,
            ]);

            if ($stmt->rowCount() === 0) {
                return new ApiResponse(false, 404, 'Student enrollment not found', []);
            }

            return new ApiResponse(true, 200, 'Student removed from class', [
                'class_id'   => $classId,
                'student_id' => $studentId,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to remove student from class', ['error' => $e->getMessage()]);
        }
    }

    public function getClassStudents(int $classId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT s.student_id,
                       s.user_id,
                       s.student_name,
                       s.email,
                       s.department_id
                FROM class_student cs
                JOIN student s ON cs.student_id = s.student_id
                WHERE cs.class_id = :class_id
                ORDER BY s.student_name ASC
            ");
            $stmt->execute([':class_id' => $classId]);

            return new ApiResponse(true, 200, 'Class students retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve class students', ['error' => $e->getMessage()]);
        }
    }
}