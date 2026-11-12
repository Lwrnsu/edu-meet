<?php

require_once __DIR__ . '/../config/Database.php';

class UserRepository
{
    private mysqli $db;

    public function __construct(?mysqli $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findAll(): array
    {
        $sql = 'SELECT user_id, email, first_name, last_name, status, created_at, updated_at, deleted_at
                FROM users
                WHERE deleted_at IS NULL
                ORDER BY user_id ASC';

        $result = $this->db->query($sql);
        if ($result === false) {
            throw new RuntimeException('Failed to fetch users: ' . $this->db->error);
        }

        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }

        return $users;
    }

    public function findById(int $id): ?array
    {
        $sql = 'SELECT user_id, email, password_hash, first_name, last_name, status, created_at, updated_at, deleted_at
                FROM users
                WHERE user_id = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findById: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $user;
    }

    public function findByEmail(string $email): ?array
    {
        $sql = 'SELECT user_id, email, password_hash, first_name, last_name, status, created_at, updated_at, deleted_at
                FROM users
                WHERE email = ? AND deleted_at IS NULL
                LIMIT 1';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare findByEmail: ' . $this->db->error);
        }

        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc() ?: null;
        $stmt->close();

        return $user;
    }

    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        if ($excludeId === null) {
            $sql = 'SELECT user_id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare emailExists: ' . $this->db->error);
            }
            $stmt->bind_param('s', $email);
        } else {
            $sql = 'SELECT user_id FROM users WHERE email = ? AND user_id <> ? AND deleted_at IS NULL LIMIT 1';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare emailExists: ' . $this->db->error);
            }
            $stmt->bind_param('si', $email, $excludeId);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc() !== null;
        $stmt->close();

        return $exists;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO users (email, password_hash, first_name, last_name, status)
                VALUES (?, ?, ?, ?, ?)';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare create: ' . $this->db->error);
        }

        $email = $data['email'];
        $passwordHash = $data['password_hash'];
        $firstName = $data['first_name'];
        $lastName = $data['last_name'];
        $status = (int) $data['status'];

        $stmt->bind_param('ssssi', $email, $passwordHash, $firstName, $lastName, $status);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to create user: ' . $error);
        }

        $id = (int) $stmt->insert_id;
        $stmt->close();

        return $id;
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['password_hash'])) {
            $sql = 'UPDATE users
                    SET email = ?, password_hash = ?, first_name = ?, last_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND deleted_at IS NULL';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
            }
            $email = $data['email'];
            $passwordHash = $data['password_hash'];
            $firstName = $data['first_name'];
            $lastName = $data['last_name'];
            $status = (int) $data['status'];
            $stmt->bind_param('ssssii', $email, $passwordHash, $firstName, $lastName, $status, $id);
        } else {
            $sql = 'UPDATE users
                    SET email = ?, first_name = ?, last_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND deleted_at IS NULL';
            $stmt = $this->db->prepare($sql);
            if ($stmt === false) {
                throw new RuntimeException('Failed to prepare update: ' . $this->db->error);
            }
            $email = $data['email'];
            $firstName = $data['first_name'];
            $lastName = $data['last_name'];
            $status = (int) $data['status'];
            $stmt->bind_param('sssii', $email, $firstName, $lastName, $status, $id);
        }

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to update user: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected >= 0;
    }

    public function softDelete(int $id): bool
    {
        $sql = 'UPDATE users
                SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND deleted_at IS NULL';

        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new RuntimeException('Failed to prepare softDelete: ' . $this->db->error);
        }

        $stmt->bind_param('i', $id);

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new RuntimeException('Failed to soft delete user: ' . $error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected > 0;
    }
}
