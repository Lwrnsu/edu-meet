<?php

require_once __DIR__ . '/../config/Database.php';

class SchoolRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = 'SELECT school_id, name, location, email, slug, status, created_at, updated_at, deleted_at
                FROM schools
                WHERE deleted_at IS NULL
                ORDER BY school_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT school_id, name, location, email, slug, status, created_at, updated_at, deleted_at
                FROM schools
                WHERE school_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $school = $stmt->fetch();

        return $school === false ? null : $school;
    }

    public function slugExists(string $slug, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT school_id FROM schools WHERE slug = ? AND deleted_at IS NULL LIMIT 1';
            $params = [$slug];
        } else {
            $sql = 'SELECT school_id FROM schools WHERE slug = ? AND school_id <> ? AND deleted_at IS NULL LIMIT 1';
            $params = [$slug, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT school_id FROM schools WHERE email = ? AND deleted_at IS NULL LIMIT 1';
            $params = [$email];
        } else {
            $sql = 'SELECT school_id FROM schools WHERE email = ? AND school_id <> ? AND deleted_at IS NULL LIMIT 1';
            $params = [$email, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO schools (name, location, email, slug, status)
                VALUES (?, ?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['location'],
            $data['email'],
            $data['slug'],
            (int) $data['status'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE schools
                SET name = ?, location = ?, email = ?, slug = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE school_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['location'],
            $data['email'],
            $data['slug'],
            (int) $data['status'],
            $id,
        ]);

        return $stmt->rowCount() >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE schools
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE school_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
