<?php
/*
    SUBJECT TO CHANGE
    Class resources: lesson files and modules faculty share with the class.
    Table: files (see php/database/file_management.sql).
*/

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/ClassUser.php';

class Resource {
    private PDO $pdo;

    public function __construct() {
        $this->pdo = Database::connect();
    }

    public function getAll(): array {
        return $this->pdo->query('
            SELECT f.*, u.name AS uploader FROM files f
            LEFT JOIN ' . ClassUser::table() . ' u ON u.id = f.uploaded_by
            ORDER BY f.created_at DESC, f.id DESC
        ')->fetchAll();
    }

    public function getById(int $id): ?array {
        $st = $this->pdo->prepare('
            SELECT f.*, u.name AS uploader FROM files f
            LEFT JOIN ' . ClassUser::table() . ' u ON u.id = f.uploaded_by
            WHERE f.id = ?
        ');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function create(string $title, string $name, string $path, int $size, int $uploadedBy): int {
        $this->pdo->prepare('INSERT INTO files (title, file_name, file_path, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?)')
            ->execute([$title, $name, $path, $size, $uploadedBy]);
        return (int)$this->pdo->lastInsertId();
    }

    public function rename(int $id, string $title): void {
        $this->pdo->prepare('UPDATE files SET title = ? WHERE id = ?')->execute([$title, $id]);
    }

    public function replaceFile(int $id, string $title, string $name, string $path, int $size): void {
        $this->pdo->prepare('UPDATE files SET title = ?, file_name = ?, file_path = ?, file_size = ? WHERE id = ?')
            ->execute([$title, $name, $path, $size, $id]);
    }

    public function delete(int $id): void {
        $this->pdo->prepare('DELETE FROM files WHERE id = ?')->execute([$id]);
    }
}
