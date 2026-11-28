<?php

require_once __DIR__ . '/../config/Database.php';

class DepartmentRepository
{
    private mysqli $db;

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = 'SELECT department_id, school_id, name, slug, status, created_at, updated_at, deleted_at
                FROM departments
                WHERE deleted_at IS NULL
                ORDER BY department_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch departments: ' . $this->db->error);
        }

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        return $rows;
    }

    public function findBySchoolId(int $schoolId): array
    {
        $sql = 'SELECT department_id, school_id, name, slug, status, created_at, updated_at, deleted_at
                FROM departments
                WHERE school_id = ? AND deleted_at IS NULL
                ORDER BY department_id ASC';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findBySchoolId: ' . $this->db->error);
        }

        $stmt->bind_param('i', $schoolId);
        $stmt->execute();
        $result = $stmt->get_result();

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        $stmt->close();

        return $rows;
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT department_id, school_id, name, slug, status, created_at, updated_at, deleted_at
                FROM departments
                WHERE department_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findById: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $row;
    }

    public function slugExists(int $schoolId, string $slug, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT department_id FROM departments
                    WHERE school_id = ? AND slug = ? AND deleted_at IS NULL
                    LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare slugExists: ' . $this->db->error);
            }
            $stmt->bind_param('is', $schoolId, $slug);
        } else {
            $sql = 'SELECT department_id FROM departments
                    WHERE school_id = ? AND slug = ? AND department_id <> ? AND deleted_at IS NULL
                    LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare slugExists: ' . $this->db->error);
            }
            $stmt->bind_param('isi', $schoolId, $slug, $excludeId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc() !== null;
        $stmt->close();

        return $exists;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO departments (school_id, name, slug, status)
                VALUES (?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $schoolId = (int) $data['school_id'];
        $name = $data['name'];
        $slug = $data['slug'];
        $status = (int) $data['status'];

        $stmt->bind_param('issi', $schoolId, $name, $slug, $status);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create department: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE departments
                SET school_id = ?, name = ?, slug = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE department_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
        }

        $schoolId = (int) $data['school_id'];
        $name = $data['name'];
        $slug = $data['slug'];
        $status = (int) $data['status'];
        $stmt->bind_param('issii', $schoolId, $name, $slug, $status, $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update department: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE departments
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE department_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare softDelete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to soft delete department: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
