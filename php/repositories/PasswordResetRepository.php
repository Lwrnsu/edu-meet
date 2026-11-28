<?php

require_once __DIR__ . '/../config/Database.php';

class PasswordResetRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connect();
    }

    public function findAll(): array
    {
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                ORDER BY reset_id ASC';

        return $this->db->query($sql)->fetchAll();
    }

    public function findByUserId(int $userId): array
    {
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                WHERE user_id = ?
                ORDER BY reset_id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                WHERE reset_id = ?
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function findLatestUnusedByUserId(int $userId): ?array
    {
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                WHERE user_id = ? AND is_used = 0 AND expires_at > NOW()
                ORDER BY reset_id DESC
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO password_resets (user_id, token_hash, expires_at, is_used)
                VALUES (?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int) $data['user_id'],
            $data['token_hash'],
            $data['expires_at'],
            (int) $data['is_used'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function createExpiring(int $userId, string $tokenHash, int $ttlMinutes = 10): array
    {
        $sql = 'INSERT INTO password_resets (user_id, token_hash, expires_at, is_used)
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0)';

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, $tokenHash, PDO::PARAM_STR);
        $stmt->bindValue(3, $ttlMinutes, PDO::PARAM_INT);
        $stmt->execute();

        $id = (int) $this->db->lastInsertId();

        $row = $this->findById($id);
        if ($row === null) {
            throw new RuntimeException('Failed to load created password reset');
        }

        return $row;
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE password_resets
                SET user_id = ?, token_hash = ?, expires_at = ?, is_used = ?
                WHERE reset_id = ?';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int) $data['user_id'],
            $data['token_hash'],
            $data['expires_at'],
            (int) $data['is_used'],
            $id,
        ]);

        return $stmt->rowCount() >= 0;
    }

    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM password_resets WHERE reset_id = ?';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);

        return $stmt->rowCount() > 0;
    }
}
