<?php
/*
    notifications table: the bell in the header (N1–N3).
    See database/files_blogs.sql.
*/
require_once __DIR__ . "/../config/Database.php";

class Notification {
    public const TYPES = ['announcement', 'blog', 'resource'];

    private PDO $pdo;

    public function __construct(?PDO $pdo = null) {
        $this->pdo = $pdo ?? Database::connect();
    }

    // SEND ONE NOTIFICATION TO MANY PEOPLE (one row each). $skipUserId = the sender.
    public function send(array $userIds, string $type, string $title, string $message, string $link, ?int $skipUserId = null): int {
        if (!in_array($type, self::TYPES, true)) {
            throw new InvalidArgumentException("Unknown notification type: $type");
        }
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($skipUserId !== null) {
            $userIds = array_values(array_diff($userIds, [$skipUserId]));
        }
        $stmt = $this->pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (:user_id, :type, :title, :message, :link)
        ");
        foreach ($userIds as $userId) {
            $stmt->execute([
                ':user_id' => $userId,
                ':type'    => $type,
                ':title'   => substr($title, 0, 100),
                ':message' => substr($message, 0, 255),
                ':link'    => substr($link, 0, 255),
            ]);
        }
        return count($userIds);
    }

    // NEWEST NOTIFICATIONS OF A USER
    public function latest(int $userId, int $limit = 20): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM notifications WHERE user_id = :user_id
            ORDER BY created_at DESC, id DESC LIMIT :limit
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // RED BADGE NUMBER
    public function unreadCount(int $userId): int {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND is_read = 0");
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    // MARK ONE AS READ (only the owner's own notification)
    public function markRead(int $id, int $userId): bool {
        $stmt = $this->pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id");
        $stmt->execute([':id' => $id, ':user_id' => $userId]);
        return $stmt->rowCount() > 0;
    }

    // MARK ALL AS READ
    public function markAllRead(int $userId): int {
        $stmt = $this->pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0");
        $stmt->execute([':user_id' => $userId]);
        return $stmt->rowCount();
    }
}
