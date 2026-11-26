<?php
/*
    class_files table: class resources and post attachments.
    See database/files_blogs.sql.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../services/ClassAccess.php";

class ClassFile {
    private PDO $pdo;

    public function __construct(?PDO $pdo = null) {
        $this->pdo = $pdo ?? Database::connect();
    }

    // SAVE A FILE ROW (after FileStorage::store)
    public function create(
        int $classId,
        int $uploadedBy,
        array $stored,
        string $context = 'resource',
        ?int $postId = null
    ): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO class_files
                (class_id, uploaded_by, context, post_id, display_name,
                 original_name, stored_name, extension, mime_type, size_bytes)
            VALUES
                (:class_id, :uploaded_by, :context, :post_id, :display_name,
                 :original_name, :stored_name, :extension, :mime_type, :size_bytes)
        ");
        $stmt->execute([
            ':class_id'      => $classId,
            ':uploaded_by'   => $uploadedBy,
            ':context'       => $context,
            ':post_id'       => $postId,
            // "Lesson 1.pdf" shows as "Lesson 1" until the faculty renames it
            ':display_name'  => pathinfo($stored['original_name'], PATHINFO_FILENAME) ?: $stored['original_name'],
            ':original_name' => $stored['original_name'],
            ':stored_name'   => $stored['stored_name'],
            ':extension'     => $stored['extension'],
            ':mime_type'     => $stored['mime_type'],
            ':size_bytes'    => $stored['size_bytes'],
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    // GET ONE FILE
    public function getById(int $id): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM class_files WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    // GET THE RESOURCES OF A CLASS (Resources tab) — everyone in the class sees all of them
    public function listResources(int $classId, ?string $search = null, ?string $typeGroup = null): array {
        $sql = "SELECT * FROM class_files f WHERE f.class_id = :class_id AND f.context = 'resource'";
        $params = [':class_id' => $classId];

        if ($search !== null && trim($search) !== '') {
            // "!" escapes % and _ so they're searched as normal characters
            $sql .= " AND (f.display_name LIKE :search ESCAPE '!' OR f.original_name LIKE :search2 ESCAPE '!')";
            $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim($search)) . '%';
            $params[':search'] = $like;
            $params[':search2'] = $like;
        }
        if ($typeGroup !== null && $typeGroup !== '') {
            $extensions = FileStorage::TYPE_GROUPS[$typeGroup] ?? null;
            if ($extensions === null) {
                throw new InvalidArgumentException("Unknown file type filter: $typeGroup");
            }
            $marks = [];
            foreach ($extensions as $i => $ext) {
                $marks[] = ":ext$i";
                $params[":ext$i"] = $ext;
            }
            $sql .= " AND f.extension IN (" . implode(',', $marks) . ")";
        }
        $sql .= " ORDER BY f.created_at DESC, f.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET THE ATTACHMENTS OF SOME POSTS, grouped by post id
    public function attachmentsFor(array $postIds): array {
        $postIds = array_values(array_unique(array_map('intval', $postIds)));
        if ($postIds === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($postIds), '?'));
        $stmt = $this->pdo->prepare("
            SELECT * FROM class_files
            WHERE context = 'attachment' AND post_id IN ($marks)
            ORDER BY id
        ");
        $stmt->execute($postIds);
        $grouped = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $grouped[(int) $row['post_id']][] = $row;
        }
        return $grouped;
    }

    // RENAME (Edit button on the faculty Resources tab)
    public function rename(int $id, string $displayName): void {
        $displayName = trim($displayName);
        if ($displayName === '') {
            throw new InvalidArgumentException("File name is required.");
        }
        if (strlen($displayName) > 255) {
            throw new InvalidArgumentException("File name is too long.");
        }
        $stmt = $this->pdo->prepare("UPDATE class_files SET display_name = :name WHERE id = :id");
        $stmt->execute([':name' => $displayName, ':id' => $id]);
    }

    // DELETE THE ROW (the caller deletes the file on disk)
    public function delete(int $id): void {
        $this->pdo->prepare("DELETE FROM class_files WHERE id = :id")->execute([':id' => $id]);
    }
}
