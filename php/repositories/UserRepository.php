<?php

require_once __DIR__ . '/../config/Database.php';

class UserRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = 'SELECT user_id, email, first_name, middle_name, last_name, suffix, status, created_at, updated_at, deleted_at
                FROM users
                WHERE deleted_at IS NULL
                ORDER BY user_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT user_id, email, password_hash, first_name, middle_name, last_name, suffix, status, created_at, updated_at, deleted_at
                FROM users
                WHERE user_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        return $user === false ? null : $user;
    }

    public function findByEmail(string $email): ?array
    {
        $sql = 'SELECT user_id, email, password_hash, first_name, middle_name, last_name, suffix, status, created_at, updated_at, deleted_at
                FROM users
                WHERE email = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        return $user === false ? null : $user;
    }

    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT user_id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1';
            $params = [$email];
        } else {
            $sql = 'SELECT user_id FROM users WHERE email = ? AND user_id <> ? AND deleted_at IS NULL LIMIT 1';
            $params = [$email, $excludeId];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetch() !== false;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO users (email, password_hash, first_name, middle_name, last_name, suffix, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['email'],
            $data['password_hash'],
            $data['first_name'],
            $data['middle_name'],
            $data['last_name'],
            $data['suffix'],
            (int) $data['status'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['password_hash'])) {
            $sql = 'UPDATE users
                    SET email = ?, password_hash = ?, first_name = ?, middle_name = ?, last_name = ?, suffix = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND deleted_at IS NULL';
            $params = [
                $data['email'],
                $data['password_hash'],
                $data['first_name'],
                $data['middle_name'],
                $data['last_name'],
                $data['suffix'],
                (int) $data['status'],
                $id,
            ];
        } else {
            $sql = 'UPDATE users
                    SET email = ?, first_name = ?, middle_name = ?, last_name = ?, suffix = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND deleted_at IS NULL';
            $params = [
                $data['email'],
                $data['first_name'],
                $data['middle_name'],
                $data['last_name'],
                $data['suffix'],
                (int) $data['status'],
                $id,
            ];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE users
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
