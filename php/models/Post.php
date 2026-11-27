<?php
/*
    posts table: announcements and blogs in a class feed.
    See database/files_blogs.sql.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../services/ClassAccess.php";

class Post {
    public const TYPES = ['announcement', 'blog'];
    public const TITLE_MAX = 150;
    public const MESSAGE_MAX = 5000;

    private PDO $pdo;

    public function __construct(?PDO $pdo = null) {
        $this->pdo = $pdo ?? Database::connect();
    }

    /*
        Every problem with the form at once, keyed by field, so the screen
        can show each error under its own input: ['title' => '...', 'message' => '...']
    */
    public static function fieldErrors(string $title, string $type, string $message): array {
        $title = trim($title);
        $message = trim($message);
        $errors = [];
        if ($title === '') {
            $errors['title'] = "A title is required before you can post.";
        } elseif (strlen($title) > self::TITLE_MAX) {
            $errors['title'] = "Title can be up to " . self::TITLE_MAX . " characters.";
        }
        if (!in_array($type, self::TYPES, true)) {
            $errors['type'] = "Post type must be Announcement or Blog.";
        }
        if ($message === '') {
            $errors['message'] = "Post message can't be empty.";
        } elseif (strlen($message) > self::MESSAGE_MAX) {
            $errors['message'] = "Message can be up to " . self::MESSAGE_MAX . " characters.";
        }
        return $errors;
    }

    // Checks title, type and message. Returns the cleaned values or throws the first error.
    public static function validate(string $title, string $type, string $message): array {
        $errors = self::fieldErrors($title, $type, $message);
        if ($errors !== []) {
            throw new InvalidArgumentException(reset($errors));
        }
        return [trim($title), $type, trim($message)];
    }

    // CREATE POST (visible to students right away)
    public function create(int $classId, int $authorId, string $type, string $title, string $message): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO posts (class_id, author_id, type, title, message)
            VALUES (:class_id, :author_id, :type, :title, :message)
        ");
        $stmt->execute([
            ':class_id'  => $classId,
            ':author_id' => $authorId,
            ':type'      => $type,
            ':title'     => $title,
            ':message'   => $message,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    // GET ONE POST
    public function getById(int $id): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM posts WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /*
        CLASS FEED, newest first, one page at a time.
        $onlyBlock: false = every post (faculty/dean)
                    int   = posts for all sections + this section
                    null  = posts for all sections only (student with no section)
    */
    public function feed(int $classId, int|false|null $onlyBlock, int $limit, int $offset, ?string $type = null): array {
        $sql = "SELECT * FROM posts p WHERE p.class_id = :class_id";
        if ($onlyBlock !== false) {
            $sql .= " AND (NOT EXISTS (SELECT 1 FROM post_audience a WHERE a.post_id = p.id)";
            if ($onlyBlock !== null) {
                $sql .= " OR EXISTS (SELECT 1 FROM post_audience a WHERE a.post_id = p.id AND a.block_id = :block_id)";
            }
            $sql .= ")";
        }
        if ($type !== null) {
            $sql .= " AND p.type = :type";
        }
        $sql .= " ORDER BY p.created_at DESC, p.id DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':class_id', $classId, PDO::PARAM_INT);
        if ($onlyBlock !== false && $onlyBlock !== null) {
            $stmt->bindValue(':block_id', $onlyBlock, PDO::PARAM_INT);
        }
        if ($type !== null) {
            $stmt->bindValue(':type', $type);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // EDIT POST
    public function update(int $id, string $type, string $title, string $message): void {
        $stmt = $this->pdo->prepare("
            UPDATE posts SET type = :type, title = :title, message = :message WHERE id = :id
        ");
        $stmt->execute([':type' => $type, ':title' => $title, ':message' => $message, ':id' => $id]);
    }

    // DELETE POST (the caller deletes its attachment files)
    public function delete(int $id): void {
        $this->pdo->prepare("DELETE FROM post_audience WHERE post_id = :id")->execute([':id' => $id]);
        $this->pdo->prepare("DELETE FROM posts WHERE id = :id")->execute([':id' => $id]);
    }

    // TARGET AUDIENCE: replace the blocks that can see a post ([] = all blocks)
    public function setAudience(int $postId, array $blockIds): void {
        $this->pdo->prepare("DELETE FROM post_audience WHERE post_id = :id")->execute([':id' => $postId]);
        $stmt = $this->pdo->prepare("INSERT INTO post_audience (post_id, block_id) VALUES (:post_id, :block_id)");
        foreach (array_unique($blockIds) as $blockId) {
            $stmt->execute([':post_id' => $postId, ':block_id' => $blockId]);
        }
    }

    // TARGET AUDIENCE of several posts, sorted Department → Program → Section (same shape as ClassFile)
    public function audienceFor(array $postIds): array {
        $postIds = array_values(array_unique(array_map('intval', $postIds)));
        if ($postIds === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($postIds), '?'));
        $stmt = $this->pdo->prepare("
            SELECT a.post_id, " . ClassAccess::SECTION_SELECT . "
            FROM post_audience a
            INNER JOIN blocks b ON b.id = a.block_id
            " . ClassAccess::SECTION_JOIN . "
            WHERE a.post_id IN ($marks)
            ORDER BY " . ClassAccess::SECTION_ORDER
        );
        $stmt->execute($postIds);
        $grouped = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $grouped[(int) $row['post_id']][] = ClassAccess::sectionInfo($row);
        }
        return $grouped;
    }

    // Can a student in $blockId (null = no block) see this post's audience?
    public function visibleToBlock(int $postId, ?int $blockId): bool {
        $audience = $this->audienceFor([$postId])[$postId] ?? [];
        return $audience === [] || ($blockId !== null && in_array($blockId, array_column($audience, 'id'), true));
    }
}
