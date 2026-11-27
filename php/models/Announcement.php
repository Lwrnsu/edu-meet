<?php
/*
    announcements + announcement_targets tables: school-wide announcements
    on the dashboard (not tied to one class). See database/announcements.sql.
    (Ported from MANGALINDAN's PostgreSQL version to MySQL.)
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../services/ClassAccess.php";

class Announcement {
    public const STATUSES = ['draft', 'published', 'archived'];

    private PDO $pdo;

    public function __construct(?PDO $pdo = null) {
        $this->pdo = $pdo ?? Database::connect();
    }

    // CREATE (with its targets). Returns the new id.
    public function create(array $data, array $targets): int {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO announcements
                    (author_id, author_role, title, body, is_pinned, status, published_at,
                     attachment_name, attachment_stored, attachment_ext, attachment_mime, attachment_size)
                VALUES
                    (:author_id, :author_role, :title, :body, :is_pinned, :status,
                     " . ($data['status'] === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL') . ",
                     :attachment_name, :attachment_stored, :attachment_ext, :attachment_mime, :attachment_size)
            ");
            $stmt->execute([
                ':author_id'         => $data['author_id'],
                ':author_role'       => $data['author_role'],
                ':title'             => $data['title'],
                ':body'              => $data['body'],
                ':is_pinned'         => $data['is_pinned'] ? 1 : 0,
                ':status'            => $data['status'],
            ] + self::attachmentParams($data['attachment'] ?? null));
            $id = (int) $this->pdo->lastInsertId();
            $this->saveTargets($id, $targets);
            $this->pdo->commit();
            return $id;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /*
        UPDATE only the given fields. $targets = null keeps the old targets.
        $attachment: false = keep, null = remove, array = replace.
        published_at is set the first time it becomes published.
    */
    public function update(int $id, array $fields, ?array $targets, array|false|null $attachment = false): void {
        $sets = [];
        $params = [':id' => $id];
        foreach (['title', 'body', 'status'] as $f) {
            if (array_key_exists($f, $fields)) {
                $sets[] = "$f = :$f";
                $params[":$f"] = $fields[$f];
            }
        }
        if (array_key_exists('is_pinned', $fields)) {
            $sets[] = "is_pinned = :is_pinned";
            $params[':is_pinned'] = $fields['is_pinned'] ? 1 : 0;
        }
        if (($fields['status'] ?? null) === 'published') {
            $sets[] = "published_at = COALESCE(published_at, CURRENT_TIMESTAMP)";
        }
        if ($attachment !== false) {
            foreach (self::attachmentParams($attachment) as $key => $value) {
                $sets[] = substr($key, 1) . " = $key";
                $params[$key] = $value;
            }
        }
        $sets[] = "updated_at = CURRENT_TIMESTAMP";

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare("UPDATE announcements SET " . implode(', ', $sets) . " WHERE id = :id")->execute($params);
            if ($targets !== null) {
                $this->pdo->prepare("DELETE FROM announcement_targets WHERE announcement_id = :id")->execute([':id' => $id]);
                $this->saveTargets($id, $targets);
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function delete(int $id): void {
        // announcement_targets rows go too (ON DELETE CASCADE in MySQL; explicit for other databases)
        $this->pdo->prepare("DELETE FROM announcement_targets WHERE announcement_id = :id")->execute([':id' => $id]);
        $this->pdo->prepare("DELETE FROM announcements WHERE id = :id")->execute([':id' => $id]);
    }

    public function find(int $id): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM announcements WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row + ['targets' => $this->targets([$id])[$id] ?? []];
    }

    /*
        DASHBOARD FEED, pinned first, then newest.
        $studentId set  → only published announcements that reach this student.
        $authorId set   → published ones plus this author's drafts/archived.
        both null       → everything (admins).
        Returns ['rows' => [...], 'has_more' => bool].
    */
    public function feed(?int $studentId, ?int $authorId, ?string $status, bool $mineOnly, int $page, int $perPage): array {
        $where = [];
        $params = [];
        if ($studentId !== null) {
            $where[] = "a.status = 'published'";
            $where[] = "EXISTS (SELECT 1 FROM announcement_targets t WHERE t.announcement_id = a.id AND "
                . ClassAccess::TARGET_REACHES_STUDENT . ")";
            $params[':student_id'] = $studentId;
        } else {
            if ($mineOnly && $authorId !== null) {
                $where[] = "a.author_id = :author_id";
                $params[':author_id'] = $authorId;
            } elseif ($authorId !== null) {
                $where[] = "(a.status = 'published' OR a.author_id = :author_id)";
                $params[':author_id'] = $authorId;
            }
            if ($status !== null) {
                $where[] = "a.status = :status";
                $params[':status'] = $status;
            }
        }
        $sql = "SELECT a.* FROM announcements a"
            . ($where ? " WHERE " . implode(' AND ', $where) : '')
            . " ORDER BY a.is_pinned DESC, COALESCE(a.published_at, a.created_at) DESC, a.id DESC
               LIMIT :limit OFFSET :offset";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $perPage + 1, PDO::PARAM_INT);
        $stmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $hasMore = count($rows) > $perPage;
        $rows = array_slice($rows, 0, $perPage);
        $targets = $this->targets(array_map(fn($r) => (int) $r['id'], $rows));
        foreach ($rows as &$r) {
            $r['targets'] = $targets[(int) $r['id']] ?? [];
        }
        return ['rows' => $rows, 'has_more' => $hasMore];
    }

    // Does this published announcement reach the student?
    public function reachesStudent(int $id, int $studentId): bool {
        $stmt = $this->pdo->prepare("
            SELECT 1 FROM announcement_targets t
            WHERE t.announcement_id = :id AND " . ClassAccess::TARGET_REACHES_STUDENT . "
            LIMIT 1
        ");
        $stmt->execute([':id' => $id, ':student_id' => $studentId]);
        return (bool) $stmt->fetchColumn();
    }

    // [announcement_id => [target rows]]
    private function targets(array $ids): array {
        if ($ids === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->pdo->prepare("
            SELECT announcement_id, scope_type, department_id, program_id, year_level, block_id
            FROM announcement_targets WHERE announcement_id IN ($marks) ORDER BY id
        ");
        $stmt->execute(array_values($ids));
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $id = (int) $row['announcement_id'];
            unset($row['announcement_id']);
            foreach (['department_id', 'program_id', 'year_level', 'block_id'] as $k) {
                $row[$k] = $row[$k] === null ? null : (int) $row[$k];
            }
            $out[$id][] = $row;
        }
        return $out;
    }

    private function saveTargets(int $id, array $targets): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO announcement_targets (announcement_id, scope_type, department_id, program_id, year_level, block_id)
            VALUES (:id, :scope_type, :department_id, :program_id, :year_level, :block_id)
        ");
        foreach ($targets as $t) {
            $stmt->execute([
                ':id'            => $id,
                ':scope_type'    => $t['scope_type'],
                ':department_id' => $t['department_id'],
                ':program_id'    => $t['program_id'],
                ':year_level'    => $t['year_level'],
                ':block_id'      => $t['block_id'],
            ]);
        }
    }

    // FileStorage::store() result (or null) → the attachment_* columns.
    private static function attachmentParams(?array $file): array {
        return [
            ':attachment_name'   => $file['original_name'] ?? null,
            ':attachment_stored' => $file['stored_name'] ?? null,
            ':attachment_ext'    => $file['extension'] ?? null,
            ':attachment_mime'   => $file['mime_type'] ?? null,
            ':attachment_size'   => $file['size_bytes'] ?? null,
        ];
    }
}
