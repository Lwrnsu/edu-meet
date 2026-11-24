<?php

require_once __DIR__ . '/BaseModel.php';

class Notification extends BaseModel {
    private ?int $notificationId;
    private int $recipientId;
    private int $announcementId;
    private string $title;
    private bool $isRead;
    private ?string $readAt;
    private ?string $createdAt;

    public function __construct(
        int $recipientId,
        int $announcementId,
        string $title,
        bool $isRead = false,
        ?int $notificationId = null,
        ?string $readAt = null,
        ?string $createdAt = null
    ) {
        if ($recipientId <= 0) {
            throw new InvalidArgumentException("recipient_id must be a positive integer.");
        }
        if ($announcementId <= 0) {
            throw new InvalidArgumentException("announcement_id must be a positive integer.");
        }
        $trimmedTitle = trim($title);
        if ($trimmedTitle === '') {
            throw new InvalidArgumentException("Notification title is required.");
        }

        $this->notificationId = $notificationId;
        $this->recipientId = $recipientId;
        $this->announcementId = $announcementId;
        $this->title = $trimmedTitle;
        $this->isRead = $isRead;
        $this->readAt = $readAt;
        $this->createdAt = $createdAt;
    }

    public function getNotificationId(): ?int {
        return $this->notificationId;
    }

    public function getRecipientId(): int {
        return $this->recipientId;
    }

    public function getAnnouncementId(): int {
        return $this->announcementId;
    }

    public function getTitle(): string {
        return $this->title;
    }

    public function isRead(): bool {
        return $this->isRead;
    }

    public function toArray(): array {
        return [
            'notification_id' => $this->notificationId,
            'recipient_id'    => $this->recipientId,
            'announcement_id' => $this->announcementId,
            'title'           => $this->title,
            'is_read'         => $this->isRead,
            'read_at'         => $this->readAt,
            'created_at'      => $this->createdAt,
        ];
    }

    private static function hydrate(array $row): self {
        return new self(
            recipientId: (int) $row['recipient_id'],
            announcementId: (int) $row['announcement_id'],
            title: (string) $row['title'],
            isRead: filter_var($row['is_read'], FILTER_VALIDATE_BOOLEAN),
            notificationId: isset($row['notification_id']) ? (int) $row['notification_id'] : null,
            readAt: $row['read_at'] ?? null,
            createdAt: $row['created_at'] ?? null
        );
    }

    public function save(): self {
        $pdo = $this->db();

        if ($this->notificationId === null) {
            $sql = "INSERT INTO notifications (recipient_id, announcement_id, title, is_read)
                    VALUES (:recipient_id, :announcement_id, :title, :is_read)
                    RETURNING *";
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':recipient_id', $this->recipientId, PDO::PARAM_INT);
            $stmt->bindValue(':announcement_id', $this->announcementId, PDO::PARAM_INT);
            $stmt->bindValue(':title', $this->title, PDO::PARAM_STR);
            $stmt->bindValue(':is_read', $this->isRead, PDO::PARAM_BOOL);
            $stmt->execute();

            $row = $stmt->fetch();
            if (!$row) {
                throw new RuntimeException("Failed to create notification.");
            }

            $hydrated = self::hydrate($row);
            $this->notificationId = $hydrated->notificationId;
            $this->readAt = $hydrated->readAt;
            $this->createdAt = $hydrated->createdAt;
            return $this;
        }

        $sql = "UPDATE notifications
                SET is_read = :is_read,
                    read_at = CASE WHEN :is_read_check THEN CURRENT_TIMESTAMP ELSE NULL END
                WHERE notification_id = :id AND recipient_id = :recipient_id
                RETURNING *";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':is_read', $this->isRead, PDO::PARAM_BOOL);
        $stmt->bindValue(':is_read_check', $this->isRead, PDO::PARAM_BOOL);
        $stmt->bindValue(':id', $this->notificationId, PDO::PARAM_INT);
        $stmt->bindValue(':recipient_id', $this->recipientId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!$row) {
            throw new RuntimeException("Notification not found for update.");
        }

        $hydrated = self::hydrate($row);
        $this->readAt = $hydrated->readAt;
        return $this;
    }

    public function delete(): bool {
        if ($this->notificationId === null) {
            return false;
        }
        $pdo = $this->db();
        $stmt = $pdo->prepare(
            "DELETE FROM notifications WHERE notification_id = :id AND recipient_id = :recipient_id"
        );
        $stmt->bindValue(':id', $this->notificationId, PDO::PARAM_INT);
        $stmt->bindValue(':recipient_id', $this->recipientId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    /**
     * Creates notifications for multiple recipients based on an announcement.
     * @param int[] $recipientIds
     * @return int Number of notifications created
     */
    public static function createForRecipients(int $announcementId, string $title, array $recipientIds): int {
        $uniqueIds = array_values(array_unique(array_filter(
            array_map('intval', $recipientIds),
            fn(int $id) => $id > 0
        )));

        if ($uniqueIds === []) {
            return 0;
        }

        $pdo = Database::connect();
        $sql = "INSERT INTO notifications (recipient_id, announcement_id, title, is_read)
                VALUES (:recipient_id, :announcement_id, :title, FALSE)";
        $stmt = $pdo->prepare($sql);

        $created = 0;
        foreach ($uniqueIds as $userId) {
            $stmt->bindValue(':recipient_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':announcement_id', $announcementId, PDO::PARAM_INT);
            $stmt->bindValue(':title', $title, PDO::PARAM_STR);
            $stmt->execute();
            $created++;
        }
        return $created;
    }

    /**
     * @return Notification[]
     */
    public static function findForUser(int $recipientId, bool $unreadOnly = false, int $limit = 30): array {
        if ($recipientId <= 0) {
            throw new InvalidArgumentException("Valid recipient_id is required.");
        }

        $safeLimit = max(1, min($limit, 100));
        $pdo = Database::connect();

        $sql = "SELECT * FROM notifications WHERE recipient_id = :recipient_id";
        if ($unreadOnly) {
            $sql .= " AND is_read = FALSE";
        }
        $sql .= " ORDER BY created_at DESC, notification_id DESC LIMIT :limit";

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':recipient_id', $recipientId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $safeLimit, PDO::PARAM_INT);
        $stmt->execute();

        $items = [];
        while ($row = $stmt->fetch()) {
            $items[] = self::hydrate($row);
        }
        return $items;
    }

    public static function countUnreadForUser(int $recipientId): int {
        if ($recipientId <= 0) {
            throw new InvalidArgumentException("Valid recipient_id is required.");
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_id = :recipient_id AND is_read = FALSE"
        );
        $stmt->bindValue(':recipient_id', $recipientId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch();

        return $row ? (int) $row['unread_count'] : 0;
    }

    public static function markAsRead(int $notificationId, int $recipientId): bool {
        if ($notificationId <= 0 || $recipientId <= 0) {
            throw new InvalidArgumentException("Valid notification_id and recipient_id are required.");
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            "UPDATE notifications
             SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
             WHERE notification_id = :id AND recipient_id = :recipient_id"
        );
        $stmt->bindValue(':id', $notificationId, PDO::PARAM_INT);
        $stmt->bindValue(':recipient_id', $recipientId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    public static function markAllAsRead(int $recipientId): int {
        if ($recipientId <= 0) {
            throw new InvalidArgumentException("Valid recipient_id is required.");
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            "UPDATE notifications
             SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
             WHERE recipient_id = :recipient_id AND is_read = FALSE"
        );
        $stmt->bindValue(':recipient_id', $recipientId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount();
    }
}