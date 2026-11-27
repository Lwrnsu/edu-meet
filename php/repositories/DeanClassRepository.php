<?php

require_once __DIR__ . '../models/ApiResponse.php';

class DeanRepository
{
    private PDO $db;
    private int $departmentId;

    public function __construct(PDO $db, int $departmentId)
    {
        $this->db           = $db;
        $this->departmentId = $departmentId;
    }

    public function getPrograms(): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT program_id, program_name, program_code, department_id
                FROM program
                WHERE department_id = :department_id
                ORDER BY program_name ASC
            ");
            $stmt->execute([':department_id' => $this->departmentId]);

            return new ApiResponse(true, 200, 'Programs retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve programs', ['error' => $e->getMessage()]);
        }
    }

    public function addProgram(string $programName, string $programCode): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO program (program_name, program_code, department_id)
                VALUES (:program_name, :program_code, :department_id)
            ");
            $stmt->execute([
                ':program_name'  => $programName,
                ':program_code'  => $programCode,
                ':department_id' => $this->departmentId,
            ]);

            return new ApiResponse(true, 201, 'Program created successfully', [
                'program_id'    => (int) $this->db->lastInsertId(),
                'program_name'  => $programName,
                'program_code'  => $programCode,
                'department_id' => $this->departmentId,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to create program', ['error' => $e->getMessage()]);
        }
    }

    public function updateProgram(int $programId, string $programName, string $programCode): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE program
                SET program_name = :program_name,
                    program_code = :program_code
                WHERE program_id = :program_id
                  AND department_id = :department_id
            ");
            $stmt->execute([
                ':program_name'  => $programName,
                ':program_code'  => $programCode,
                ':program_id'    => $programId,
                ':department_id' => $this->departmentId,
            ]);

            if ($stmt->rowCount() === 0) {
                return new ApiResponse(false, 404, 'Program not found in this department', []);
            }

            return new ApiResponse(true, 200, 'Program updated successfully', [
                'program_id'   => $programId,
                'program_name' => $programName,
                'program_code' => $programCode,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to update program', ['error' => $e->getMessage()]);
        }
    }

    public function deleteProgram(int $programId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM program
                WHERE program_id = :program_id
                  AND department_id = :department_id
            ");
            $stmt->execute([
                ':program_id'    => $programId,
                ':department_id' => $this->departmentId,
            ]);

            if ($stmt->rowCount() === 0) {
                return new ApiResponse(false, 404, 'Program not found in this department', []);
            }

            return new ApiResponse(true, 200, 'Program deleted successfully', ['program_id' => $programId]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to delete program', ['error' => $e->getMessage()]);
        }
    }

    public function getProgramChairs(): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                SELECT pc.chair_id,
                       pc.user_id,
                       pc.chair_name,
                       pc.email,
                       pc.program_id,
                       p.program_name,
                       p.program_code,
                       pc.prof_id
                FROM program_chair pc
                JOIN program p ON pc.program_id = p.program_id
                WHERE p.department_id = :department_id
                ORDER BY p.program_name ASC
            ");
            $stmt->execute([':department_id' => $this->departmentId]);

            return new ApiResponse(true, 200, 'Program chairs retrieved successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to retrieve program chairs', ['error' => $e->getMessage()]);
        }
    }

    public function assignProgramChair(int $userId, string $chairName, string $email, int $programId, ?int $profId): ApiResponse
    {
        try {
            $progCheck = $this->db->prepare("
                SELECT program_id FROM program
                WHERE program_id = :program_id AND department_id = :department_id
            ");
            $progCheck->execute([
                ':program_id'    => $programId,
                ':department_id' => $this->departmentId,
            ]);
            if (!$progCheck->fetch()) {
                return new ApiResponse(false, 404, 'Program does not belong to this department', []);
            }

            $stmt = $this->db->prepare("
                INSERT INTO program_chair (user_id, chair_name, email, program_id, prof_id)
                VALUES (:user_id, :chair_name, :email, :program_id, :prof_id)
            ");
            $stmt->execute([
                ':user_id'    => $userId,
                ':chair_name' => $chairName,
                ':email'      => $email !== '' ? $email : null,
                ':program_id' => $programId,
                ':prof_id'    => $profId,
            ]);

            return new ApiResponse(true, 201, 'Program chair assigned successfully', [
                'chair_id'   => (int) $this->db->lastInsertId(),
                'program_id' => $programId,
                'user_id'    => $userId,
            ]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to assign program chair', ['error' => $e->getMessage()]);
        }
    }

    public function removeProgramChair(int $chairId): ApiResponse
    {
        try {
            $stmt = $this->db->prepare("
                DELETE pc FROM program_chair pc
                JOIN program p ON pc.program_id = p.program_id
                WHERE pc.chair_id = :chair_id
                  AND p.department_id = :department_id
            ");
            $stmt->execute([
                ':chair_id'      => $chairId,
                ':department_id' => $this->departmentId,
            ]);

            if ($stmt->rowCount() === 0) {
                return new ApiResponse(false, 404, 'Program chair assignment not found in this department', []);
            }

            return new ApiResponse(true, 200, 'Program chair removed successfully', ['chair_id' => $chairId]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, 'Failed to remove program chair', ['error' => $e->getMessage()]);
        }
    }
}