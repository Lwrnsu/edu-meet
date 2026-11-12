<?php

require_once __DIR__ . '/../config/Database.php';

class RoleRepository
{
    private mysqli $db;

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = 'SELECT role_id, name, description, status, created_at, updated_at, deleted_at
                FROM roles
                WHERE deleted_at IS NULL
                ORDER BY role_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch roles: ' . $this->db->error);
        }

        $roles = [];
        while ($row = $result->fetch_assoc()) {
            $roles[] = $row;
        }

        return $roles;
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT role_id, name, description, status, created_at, updated_at, deleted_at
                FROM roles
                WHERE role_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findById: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $role = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $role;
    }

    public function nameExists(string $name, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT role_id FROM roles WHERE name = ? AND deleted_at IS NULL LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare nameExists: ' . $this->db->error);
            }
            $stmt->bind_param('s', $name);
        } else {
            $sql = 'SELECT role_id FROM roles WHERE name = ? AND role_id <> ? AND deleted_at IS NULL LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare nameExists: ' . $this->db->error);
            }
            $stmt->bind_param('si', $name, $excludeId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc() !== null;
        $stmt->close();

        return $exists;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO roles (name, description, status)
                VALUES (?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $name = $data['name'];
        $description = $data['description'];
        $status = (int) $data['status'];

        $stmt->bind_param('ssi', $name, $description, $status);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create role: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE roles
                SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE role_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
        }

        $name = $data['name'];
        $description = $data['description'];
        $status = (int) $data['status'];
        $stmt->bind_param('ssii', $name, $description, $status, $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update role: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE roles
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE role_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare softDelete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to soft delete role: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
