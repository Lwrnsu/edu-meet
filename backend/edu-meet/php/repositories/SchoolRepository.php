<?php

require_once __DIR__ . '/../config/Database.php';

class SchoolRepository
{
    private mysqli $db;

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = 'SELECT school_id, name, location, slug, status, created_at, updated_at, deleted_at
                FROM schools
                WHERE deleted_at IS NULL
                ORDER BY school_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch schools: ' . $this->db->error);
        }

        $schools = [];
        while ($row = $result->fetch_assoc()) {
            $schools[] = $row;
        }

        return $schools;
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT school_id, name, location, slug, status, created_at, updated_at, deleted_at
                FROM schools
                WHERE school_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findById: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $school = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $school;
    }

    public function slugExists(string $slug, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT school_id FROM schools WHERE slug = ? AND deleted_at IS NULL LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare slugExists: ' . $this->db->error);
            }
            $stmt->bind_param('s', $slug);
        } else {
            $sql = 'SELECT school_id FROM schools WHERE slug = ? AND school_id <> ? AND deleted_at IS NULL LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare slugExists: ' . $this->db->error);
            }
            $stmt->bind_param('si', $slug, $excludeId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc() !== null;
        $stmt->close();

        return $exists;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO schools (name, location, slug, status)
                VALUES (?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $name = $data['name'];
        $location = $data['location'];
        $slug = $data['slug'];
        $status = (int) $data['status'];

        $stmt->bind_param('sssi', $name, $location, $slug, $status);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create school: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE schools
                SET name = ?, location = ?, slug = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE school_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
        }

        $name = $data['name'];
        $location = $data['location'];
        $slug = $data['slug'];
        $status = (int) $data['status'];
        $stmt->bind_param('sssii', $name, $location, $slug, $status, $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update school: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE schools
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE school_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare softDelete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to soft delete school: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
