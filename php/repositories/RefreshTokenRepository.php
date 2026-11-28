<?php

require_once __DIR__ . '/../config/Database.php';

class RefreshTokenRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = 'SELECT token_id, user_id, token_hash, expires_at, created_at
                FROM refresh_tokens
                ORDER BY token_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findByUserId(int $userId): array
    {
        $sql = 'SELECT token_id, user_id, token_hash, expires_at, created_at
                FROM refresh_tokens
                WHERE user_id = ?
                ORDER BY token_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT token_id, user_id, token_hash, expires_at, created_at
                FROM refresh_tokens
                WHERE token_id = ?
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                VALUES (?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int) $data['user_id'],
            $data['token_hash'],
            $data['expires_at'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE refresh_tokens
                SET user_id = ?, token_hash = ?, expires_at = ?
                WHERE token_id = ?';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int) $data['user_id'],
            $data['token_hash'],
            $data['expires_at'],
            $id,
        ]);

        return $stmt->rowCount() >= 0;
    }

    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM refresh_tokens WHERE token_id = ?';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
