<?php
/*
    SUBJECT TO CHANGE
    Class tasks (assignments) and the files faculty attach to them.
    Tables: tasks, task_files (see php/database/file_management.sql).
*/

require_once __DIR__ . '/../config/Database.php';

class Task {
    private PDO $pdo;

    public function __construct() {
        $this->pdo = Database::connect();
    }

    // ALL TASKS, newest first, with the viewer's own score and the submission count.
    public function getAll(int $viewerId): array {
        $st = $this->pdo->prepare('
            SELECT t.*, s.score AS my_score,
                (SELECT COUNT(*) FROM submissions WHERE task_id = t.id) AS submission_count,
                (SELECT COUNT(*) FROM task_files WHERE task_id = t.id) AS attachment_count
            FROM tasks t
            LEFT JOIN submissions s ON s.task_id = t.id AND s.student_id = :viewer
            ORDER BY t.created_at DESC, t.id DESC
        ');
        $st->execute([':viewer' => $viewerId]);
        return $st->fetchAll();
    }

    public function getById(int $id): ?array {
        $st = $this->pdo->prepare('SELECT * FROM tasks WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function create(array $v, int $createdBy): int {
        $this->pdo->prepare('
            INSERT INTO tasks (title, description, due_date, max_score, allow_late, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([$v['title'], $v['description'], $v['due_date'], $v['max_score'], $v['allow_late'], $createdBy]);
        return (int)$this->pdo->lastInsertId();
    }

    public function update(int $id, array $v): void {
        $this->pdo->prepare('
            UPDATE tasks SET title = ?, description = ?, due_date = ?, max_score = ?, allow_late = ? WHERE id = ?
        ')->execute([$v['title'], $v['description'], $v['due_date'], $v['max_score'], $v['allow_late'], $id]);
    }

    // Deletes the task (attachments and submissions cascade) and returns the stored
    // file names so the caller can remove them from disk.
    public function delete(int $id): array {
        $paths = [];
        foreach (['task_files', 'submissions'] as $tbl) {
            $st = $this->pdo->prepare("SELECT file_path FROM $tbl WHERE task_id = ?");
            $st->execute([$id]);
            $paths = array_merge($paths, $st->fetchAll(PDO::FETCH_COLUMN));
        }
        $this->pdo->prepare('DELETE FROM tasks WHERE id = ?')->execute([$id]);
        return $paths;
    }

    // Submissions close at the due date when late submissions are not allowed.
    public static function isClosed(array $task): bool {
        return $task['due_date'] && time() > strtotime($task['due_date']) && !$task['allow_late'];
    }

    public static function isLate(array $task, ?string $submittedAt): bool {
        return $task['due_date'] && $submittedAt && strtotime($submittedAt) > strtotime($task['due_date']);
    }

    // ---- Attachments ----

    public function getAttachments(int $taskId): array {
        $st = $this->pdo->prepare('SELECT * FROM task_files WHERE task_id = ? ORDER BY id');
        $st->execute([$taskId]);
        return $st->fetchAll();
    }

    public function getAttachment(int $id): ?array {
        $st = $this->pdo->prepare('SELECT * FROM task_files WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function addAttachment(int $taskId, string $name, string $path, int $size): int {
        $this->pdo->prepare('INSERT INTO task_files (task_id, file_name, file_path, file_size) VALUES (?, ?, ?, ?)')
            ->execute([$taskId, $name, $path, $size]);
        return (int)$this->pdo->lastInsertId();
    }

    // Removes one attachment of this task and returns its row (or null if it isn't this task's).
    public function removeAttachment(int $id, int $taskId): ?array {
        $st = $this->pdo->prepare('SELECT * FROM task_files WHERE id = ? AND task_id = ?');
        $st->execute([$id, $taskId]);
        $a = $st->fetch();
        if (!$a) return null;
        $this->pdo->prepare('DELETE FROM task_files WHERE id = ?')->execute([$id]);
        return $a;
    }
}
