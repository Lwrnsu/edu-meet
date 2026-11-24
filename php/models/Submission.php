<?php
/*
    SUBJECT TO CHANGE
    Student submissions for tasks: one file per student per task, plus score and feedback.
    Table: submissions (see php/database/file_management.sql).
*/

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/ClassUser.php';

class Submission {
    private PDO $pdo;

    public function __construct() {
        $this->pdo = Database::connect();
    }

    public function getById(int $id): ?array {
        $st = $this->pdo->prepare('SELECT * FROM submissions WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function getForStudent(int $taskId, int $studentId): ?array {
        $st = $this->pdo->prepare('SELECT * FROM submissions WHERE task_id = ? AND student_id = ?');
        $st->execute([$taskId, $studentId]);
        return $st->fetch() ?: null;
    }

    // Submissions for a task keyed by student_id.
    public function getByTask(int $taskId): array {
        $st = $this->pdo->prepare('SELECT * FROM submissions WHERE task_id = ?');
        $st->execute([$taskId]);
        $out = [];
        foreach ($st->fetchAll() as $r) $out[$r['student_id']] = $r;
        return $out;
    }

    // Submissions with the student's name, for building the ZIP download.
    public function getByTaskWithNames(int $taskId): array {
        $st = $this->pdo->prepare('
            SELECT u.name, s.file_name, s.file_path FROM submissions s
            JOIN ' . ClassUser::table() . ' u ON u.id = s.student_id
            WHERE s.task_id = ? ORDER BY u.name
        ');
        $st->execute([$taskId]);
        return $st->fetchAll();
    }

    // Insert or replace the student's file for this task.
    public function save(int $taskId, int $studentId, string $name, string $path, int $size): void {
        $this->pdo->prepare('
            INSERT INTO submissions (task_id, student_id, file_name, file_path, file_size) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), file_path = VALUES(file_path),
                file_size = VALUES(file_size), submitted_at = NOW()
        ')->execute([$taskId, $studentId, $name, $path, $size]);
    }

    public function delete(int $id): void {
        $this->pdo->prepare('DELETE FROM submissions WHERE id = ?')->execute([$id]);
    }

    public function setScore(int $id, ?float $score, string $feedback): void {
        $this->pdo->prepare('UPDATE submissions SET score = ?, feedback = ? WHERE id = ?')
            ->execute([$score, $feedback, $id]);
    }
}
