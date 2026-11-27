<?php

require_once __DIR__ . '/../config/Database.php';

class DepartmentRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = 'SELECT department_id, school_id, name, slug, status, created_at, updated_at, deleted_at
                FROM departments
                WHERE deleted_at IS NULL
                ORDER BY department_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findBySchoolId(int $schoolId): array
    {
        $sql = 'SELECT department_id, school_id, name, slug, status, created_at, updated_at, deleted_at
                FROM departments
                WHERE school_id = ? AND deleted_at IS NULL
                ORDER BY department_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$schoolId]);

        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT department_id, school_id, name, slug, status, created_at, updated_at, deleted_at
                FROM departments
                WHERE department_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function slugExists(int $schoolId, string $slug, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT department_id FROM departments
                    WHERE school_id = ? AND slug = ? AND deleted_at IS NULL
                    LIMIT 1';
            $params = [$schoolId, $slug];
        } else {
            $sql = 'SELECT department_id FROM departments
                    WHERE school_id = ? AND slug = ? AND department_id <> ? AND deleted_at IS NULL
                    LIMIT 1';
            $params = [$schoolId, $slug, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO departments (school_id, name, slug, status)
                VALUES (?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int) $data['school_id'],
            $data['name'],
            $data['slug'],
            (int) $data['status'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE departments
                SET school_id = ?, name = ?, slug = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE department_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int) $data['school_id'],
            $data['name'],
            $data['slug'],
            (int) $data['status'],
            $id,
        ]);

        return $stmt->rowCount() >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE departments
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE department_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
