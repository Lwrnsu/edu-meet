<?php

require_once __DIR__ . '/../config/Database.php';

class RoleRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = 'SELECT role_id, name, description, status, created_at, updated_at, deleted_at
                FROM roles
                WHERE deleted_at IS NULL
                ORDER BY role_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT role_id, name, description, status, created_at, updated_at, deleted_at
                FROM roles
                WHERE role_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $role = $stmt->fetch();

        return $role === false ? null : $role;
    }

    public function findByName(string $name): ?array
    {
        $sql = 'SELECT role_id, name, description, status, created_at, updated_at, deleted_at
                FROM roles
                WHERE name = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$name]);
        $role = $stmt->fetch();

        return $role === false ? null : $role;
    }

    public function nameExists(string $name, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT role_id FROM roles WHERE name = ? AND deleted_at IS NULL LIMIT 1';
            $params = [$name];
        } else {
            $sql = 'SELECT role_id FROM roles WHERE name = ? AND role_id <> ? AND deleted_at IS NULL LIMIT 1';
            $params = [$name, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO roles (name, description, status)
                VALUES (?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['description'],
            (int) $data['status'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE roles
                SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE role_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['description'],
            (int) $data['status'],
            $id,
        ]);

        return $stmt->rowCount() >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE roles
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE role_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
