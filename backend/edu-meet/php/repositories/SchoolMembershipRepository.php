<?php

require_once __DIR__ . '/../config/Database.php';

class SchoolMembershipRepository
{
    private mysqli $db;

    private const SELECT_JOIN = 'SELECT sm.membership_id, sm.school_id, s.name AS school_name,
                sm.user_id, sm.role_id, r.name AS role_name, sm.status,
                sm.joined_at, sm.created_at, sm.updated_at, sm.deleted_at
                FROM school_memberships sm
                INNER JOIN schools s ON s.school_id = sm.school_id AND s.deleted_at IS NULL
                INNER JOIN roles r ON r.role_id = sm.role_id AND r.deleted_at IS NULL';

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch school memberships: ' . $this->db->error);
        }

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        return $rows;
    }

    public function findBySchoolId(int $schoolId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.school_id = ? AND sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

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

    public function findByUserId(int $userId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.user_id = ? AND sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

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
        $sql = self::SELECT_JOIN . ' WHERE sm.membership_id = ? AND sm.deleted_at IS NULL LIMIT 1';

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

    public function exists(int $schoolId, int $userId, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT membership_id FROM school_memberships
                    WHERE school_id = ? AND user_id = ? AND deleted_at IS NULL
                    LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare exists: ' . $this->db->error);
            }
            $stmt->bind_param('ii', $schoolId, $userId);
        } else {
            $sql = 'SELECT membership_id FROM school_memberships
                    WHERE school_id = ? AND user_id = ? AND membership_id <> ? AND deleted_at IS NULL
                    LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare exists: ' . $this->db->error);
            }
            $stmt->bind_param('iii', $schoolId, $userId, $excludeId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc() !== null;
        $stmt->close();

        return $exists;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO school_memberships (school_id, user_id, role_id, status)
                VALUES (?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $schoolId = (int) $data['school_id'];
        $userId = (int) $data['user_id'];
        $roleId = (int) $data['role_id'];
        $status = (int) $data['status'];

        $stmt->bind_param('iiii', $schoolId, $userId, $roleId, $status);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create school membership: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE school_memberships
                SET role_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE membership_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
        }

        $roleId = (int) $data['role_id'];
        $status = (int) $data['status'];
        $stmt->bind_param('iii', $roleId, $status, $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update school membership: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE school_memberships
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE membership_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare softDelete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to soft delete school membership: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
