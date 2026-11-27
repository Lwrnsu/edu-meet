<?php

require_once __DIR__ . '/../config/Database.php';

class UserRoleRepository
{
    private PDO $db;

    private const SELECT_JOIN = 'SELECT ur.user_role_id, ur.user_id, ur.role_id, r.name AS role_name, ur.assigned_at
                FROM user_roles ur
                INNER JOIN roles r ON r.role_id = ur.role_id AND r.deleted_at IS NULL';

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = self::SELECT_JOIN . ' ORDER BY ur.user_role_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findByUserId(int $userId): array
    {
        $sql = self::SELECT_JOIN . ' WHERE ur.user_id = ? ORDER BY ur.user_role_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = self::SELECT_JOIN . ' WHERE ur.user_role_id = ? LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function exists(int $userId, int $roleId, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT user_role_id FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1';
            $params = [$userId, $roleId];
        } else {
            $sql = 'SELECT user_role_id FROM user_roles
                    WHERE user_id = ? AND role_id = ? AND user_role_id <> ? LIMIT 1';
            $params = [$userId, $roleId, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function create(int $userId, int $roleId): int
    {
        $sql = 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $roleId]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, int $roleId): bool
    {
        $sql = 'UPDATE user_roles SET role_id = ? WHERE user_role_id = ?';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$roleId, $id]);

        return $stmt->rowCount() >= 0;
    }

    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM user_roles WHERE user_role_id = ?';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
