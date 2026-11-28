<?php
/*
    tasks + task_submissions tables (Tasks / Activities tabs of a class).
    See database/files_blogs.sql.

    A task is open until its deadline, or until the faculty closes it.
    Each student hands in one file per task; handing in again replaces it.
*/
require_once __DIR__ . "/../config/Database.php";

class Task {
    private PDO $pdo;

    public function __construct(?PDO $pdo = null) {
        $this->pdo = $pdo ?? Database::connect();
    }

    // ---------- tasks ----------

    public function create(array $data): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO tasks (class_id, created_by, title, instructions, max_score, deadline, is_closed,
                               attachment_original_name, attachment_stored_name, attachment_extension,
                               attachment_mime_type, attachment_size_bytes)
            VALUES (:class_id, :created_by, :title, :instructions, :max_score, :deadline, :is_closed,
                    :a_name, :a_stored, :a_ext, :a_mime, :a_size)
        ");
        $stmt->execute([
            ':class_id'     => $data['class_id'],
            ':created_by'   => $data['created_by'],
            ':title'        => $data['title'],
            ':instructions' => $data['instructions'],
            ':max_score'    => $data['max_score'],
            ':deadline'     => $data['deadline'],
            ':is_closed'    => $data['is_closed'] ? 1 : 0,
        ] + self::fileParams($data['attachment'] ?? null));
        return (int) $this->pdo->lastInsertId();
    }

    // $attachment: false = keep, null = remove, array = replace.
    public function update(int $id, array $fields, array|false|null $attachment = false): void {
        $sets = [];
        $params = [':id' => $id];
        foreach (['title', 'instructions', 'max_score', 'deadline', 'is_closed'] as $f) {
            if (array_key_exists($f, $fields)) {
                $sets[] = "$f = :$f";
                $params[":$f"] = is_bool($fields[$f]) ? (int) $fields[$f] : $fields[$f];
            }
        }
        if ($attachment !== false) {
            $sets[] = "attachment_original_name = :a_name, attachment_stored_name = :a_stored,
                       attachment_extension = :a_ext, attachment_mime_type = :a_mime, attachment_size_bytes = :a_size";
            $params += self::fileParams($attachment);
        }
        if ($sets === []) {
            return;
        }
        $sets[] = "updated_at = CURRENT_TIMESTAMP";
        $this->pdo->prepare("UPDATE tasks SET " . implode(', ', $sets) . " WHERE id = :id")->execute($params);
    }

    public function find(int $id): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM tasks WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // Tasks of a class, newest deadline first, optionally filtered by title.
    public function forClass(int $classId, ?string $search = null): array {
        $sql = "SELECT * FROM tasks WHERE class_id = :class_id";
        $params = [':class_id' => $classId];
        if ($search !== null && trim($search) !== '') {
            $sql .= " AND title LIKE :search";
            $params[':search'] = '%' . trim($search) . '%';
        }
        $stmt = $this->pdo->prepare($sql . " ORDER BY deadline DESC, id DESC");
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Stored file names of the task and all its submissions (to delete from disk).
    public function storedFiles(int $id): array {
        $stmt = $this->pdo->prepare("
            SELECT attachment_stored_name FROM tasks WHERE id = :id AND attachment_stored_name IS NOT NULL
            UNION ALL
            SELECT stored_name FROM task_submissions WHERE task_id = :id2
        ");
        $stmt->execute([':id' => $id, ':id2' => $id]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function delete(int $id): void {
        $this->pdo->prepare("DELETE FROM task_submissions WHERE task_id = :id")->execute([':id' => $id]);
        $this->pdo->prepare("DELETE FROM tasks WHERE id = :id")->execute([':id' => $id]);
    }

    // ---------- submissions ----------

    // [task_id => submitted count] for these tasks, counting only these students.
    public function submittedCounts(array $taskIds, array $studentIds): array {
        if ($taskIds === [] || $studentIds === []) {
            return [];
        }
        $t = implode(',', array_fill(0, count($taskIds), '?'));
        $s = implode(',', array_fill(0, count($studentIds), '?'));
        $stmt = $this->pdo->prepare("
            SELECT task_id, COUNT(*) AS n FROM task_submissions
            WHERE task_id IN ($t) AND student_id IN ($s)
            GROUP BY task_id
        ");
        $stmt->execute([...array_values($taskIds), ...array_values($studentIds)]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['task_id']] = (int) $r['n'];
        }
        return $out;
    }

    // [task_id => submission row] of one student.
    public function studentSubmissions(array $taskIds, int $studentId): array {
        if ($taskIds === []) {
            return [];
        }
        $t = implode(',', array_fill(0, count($taskIds), '?'));
        $stmt = $this->pdo->prepare("SELECT * FROM task_submissions WHERE task_id IN ($t) AND student_id = ?");
        $stmt->execute([...array_values($taskIds), $studentId]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['task_id']] = $r;
        }
        return $out;
    }

    // [student_id => submission row] for a task.
    public function submissions(int $taskId): array {
        $stmt = $this->pdo->prepare("SELECT * FROM task_submissions WHERE task_id = :id");
        $stmt->execute([':id' => $taskId]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['student_id']] = $r;
        }
        return $out;
    }

    public function findSubmission(int $id): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM task_submissions WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function submission(int $taskId, int $studentId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM task_submissions WHERE task_id = :t AND student_id = :s");
        $stmt->execute([':t' => $taskId, ':s' => $studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // Hand in (or replace) a student's file. Replacing clears the old grade.
    public function saveSubmission(int $taskId, int $studentId, array $file, string $now): void {
        $params = [
            ':name'   => $file['original_name'],
            ':stored' => $file['stored_name'],
            ':ext'    => $file['extension'],
            ':mime'   => $file['mime_type'],
            ':size'   => $file['size_bytes'],
            ':t'      => $taskId,
            ':s'      => $studentId,
            ':now'    => $now,
        ];
        if ($this->submission($taskId, $studentId) !== null) {
            $this->pdo->prepare("
                UPDATE task_submissions
                SET original_name = :name, stored_name = :stored, extension = :ext, mime_type = :mime,
                    size_bytes = :size, submitted_at = :now,
                    score = NULL, feedback = NULL, graded_by = NULL, graded_at = NULL
                WHERE task_id = :t AND student_id = :s
            ")->execute($params);
            return;
        }
        $this->pdo->prepare("
            INSERT INTO task_submissions (task_id, student_id, original_name, stored_name, extension, mime_type, size_bytes, submitted_at)
            VALUES (:t, :s, :name, :stored, :ext, :mime, :size, :now)
        ")->execute($params);
    }

    public function deleteSubmission(int $id): void {
        $this->pdo->prepare("DELETE FROM task_submissions WHERE id = :id")->execute([':id' => $id]);
    }

    public function grade(int $id, float $score, ?string $feedback, int $graderId, string $now): void {
        $this->pdo->prepare("
            UPDATE task_submissions
            SET score = :score, feedback = :feedback, graded_by = :by, graded_at = :now
            WHERE id = :id
        ")->execute([':score' => $score, ':feedback' => $feedback, ':by' => $graderId, ':now' => $now, ':id' => $id]);
    }

    private static function fileParams(?array $file): array {
        return [
            ':a_name'   => $file['original_name'] ?? null,
            ':a_stored' => $file['stored_name'] ?? null,
            ':a_ext'    => $file['extension'] ?? null,
            ':a_mime'   => $file['mime_type'] ?? null,
            ':a_size'   => $file['size_bytes'] ?? null,
        ];
    }
}
