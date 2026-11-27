<?php

require_once __DIR__ . '/../config/Database.php';

class SchoolMembershipRepository
{
    private PDO $db;

    private const SELECT_JOIN = 'SELECT sm.membership_id, sm.school_id, s.name AS school_name,
                sm.department_id, d.name AS department_name, d.slug AS department_slug,
                sm.user_id, sm.role_id, r.name AS role_name, sm.status,
                sm.joined_at, sm.created_at, sm.updated_at, sm.deleted_at
                FROM school_memberships sm
                INNER JOIN schools s ON s.school_id = sm.school_id AND s.deleted_at IS NULL
                INNER JOIN roles r ON r.role_id = sm.role_id AND r.deleted_at IS NULL
                LEFT JOIN departments d ON d.department_id = sm.department_id AND d.deleted_at IS NULL';

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findBySchoolId(int $schoolId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.school_id = ? AND sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$schoolId]);

        return $stmt->fetchAll();
    }

    public function findByUserId(int $userId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.user_id = ? AND sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll();
    }

    public function findByDepartmentId(int $departmentId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.department_id = ? AND sm.deleted_at IS NULL ORDER BY sm.membership_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$departmentId]);

        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = self::SELECT_JOIN . ' WHERE sm.membership_id = ? AND sm.deleted_at IS NULL LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function exists(int $schoolId, int $userId, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT membership_id FROM school_memberships
                    WHERE school_id = ? AND user_id = ? AND deleted_at IS NULL
                    LIMIT 1';
            $params = [$schoolId, $userId];
        } else {
            $sql = 'SELECT membership_id FROM school_memberships
                    WHERE school_id = ? AND user_id = ? AND membership_id <> ? AND deleted_at IS NULL
                    LIMIT 1';
            $params = [$schoolId, $userId, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function create(array $data): int
    {
        $schoolId = (int) $data['school_id'];
        $departmentId = $data['department_id'];
        $userId = (int) $data['user_id'];
        $roleId = (int) $data['role_id'];
        $status = (int) $data['status'];

        if ($departmentId === null) {
            $sql = 'INSERT INTO school_memberships (school_id, department_id, user_id, role_id, status)
                    VALUES (?, NULL, ?, ?, ?)';
            $params = [$schoolId, $userId, $roleId, $status];
        } else {
            $sql = 'INSERT INTO school_memberships (school_id, department_id, user_id, role_id, status)
                    VALUES (?, ?, ?, ?, ?)';
            $params = [$schoolId, (int) $departmentId, $userId, $roleId, $status];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $departmentId = $data['department_id'];
        $roleId = (int) $data['role_id'];
        $status = (int) $data['status'];

        if ($departmentId === null) {
            $sql = 'UPDATE school_memberships
                    SET department_id = NULL, role_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE membership_id = ? AND deleted_at IS NULL';
            $params = [$roleId, $status, $id];
        } else {
            $sql = 'UPDATE school_memberships
                    SET department_id = ?, role_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE membership_id = ? AND deleted_at IS NULL';
            $params = [(int) $departmentId, $roleId, $status, $id];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE school_memberships
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE membership_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
