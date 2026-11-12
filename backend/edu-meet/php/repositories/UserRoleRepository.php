<?php

require_once __DIR__ . '/../config/Database.php';

class UserRoleRepository
{
    private mysqli $db;

    private const SELECT_JOIN = 'SELECT ur.user_role_id, ur.user_id, ur.role_id, r.name AS role_name, ur.assigned_at
                FROM user_roles ur
                INNER JOIN roles r ON r.role_id = ur.role_id AND r.deleted_at IS NULL';

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = self::SELECT_JOIN . ' ORDER BY ur.user_role_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch user roles: ' . $this->db->error);
        }

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        return $rows;
    }

    public function findByUserId(int $userId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE ur.user_id = ? ORDER BY ur.user_role_id ASC';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findByUserId: ' . $this->db->error);
        }

        $stmt->bind_param('i', $userId);
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
        $sql = self::SELECT_JOIN . ' WHERE ur.user_role_id = ? LIMIT 1';

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

    public function exists(int $userId, int $roleId, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT user_role_id FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare exists: ' . $this->db->error);
            }
            $stmt->bind_param('ii', $userId, $roleId);
        } else {
            $sql = 'SELECT user_role_id FROM user_roles
                    WHERE user_id = ? AND role_id = ? AND user_role_id <> ? LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare exists: ' . $this->db->error);
            }
            $stmt->bind_param('iii', $userId, $roleId, $excludeId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc() !== null;
        $stmt->close();

        return $exists;
    }

    public function create(int $userId, int $roleId): int
    {
        $sql = 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $stmt->bind_param('ii', $userId, $roleId);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create user role: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, int $roleId): bool
    {
        $sql = 'UPDATE user_roles SET role_id = ? WHERE user_role_id = ?';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
        }

        $stmt->bind_param('ii', $roleId, $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update user role: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM user_roles WHERE user_role_id = ?';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare delete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to delete user role: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
