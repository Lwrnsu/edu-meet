<?php

require_once __DIR__ . '/../config/Database.php';

class PasswordResetRepository
{
    private mysqli $db;

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                ORDER BY reset_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch password resets: ' . $this->db->error);
        }

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        return $rows;
    }

    public function findByUserId(int $userId): array
    {
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                WHERE user_id = ?
                ORDER BY reset_id ASC';

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
        $sql = 'SELECT reset_id, user_id, token_hash, expires_at, is_used, created_at
                FROM password_resets
                WHERE reset_id = ?
                LIMIT 1';

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

    public function create(array $data): int
    {
        $sql = 'INSERT INTO password_resets (user_id, token_hash, expires_at, is_used)
                VALUES (?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $userId = (int) $data['user_id'];
        $tokenHash = $data['token_hash'];
        $expiresAt = $data['expires_at'];
        $isUsed = (int) $data['is_used'];

        $stmt->bind_param('issi', $userId, $tokenHash, $expiresAt, $isUsed);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create password reset: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE password_resets
                SET user_id = ?, token_hash = ?, expires_at = ?, is_used = ?
                WHERE reset_id = ?';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
        }

        $userId = (int) $data['user_id'];
        $tokenHash = $data['token_hash'];
        $expiresAt = $data['expires_at'];
        $isUsed = (int) $data['is_used'];
        $stmt->bind_param('issii', $userId, $tokenHash, $expiresAt, $isUsed, $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update password reset: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM password_resets WHERE reset_id = ?';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare delete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to delete password reset: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
