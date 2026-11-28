<?php
/*
    NOTIFICATIONS — the bell in the header.

    N1 Bell with unread badge     list() → unread
    N2 Notification list          list(), read(), readAll()
    N3 Empty list                 list() with no notifications
*/
require_once __DIR__ . "/../models/ApiResponse.php";
require_once __DIR__ . "/../models/Notification.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";

class NotificationController {
    private Notification $notifications;

    public function __construct(PDO $pdo, private CurrentUser $user) {
        $this->notifications = new Notification($pdo);
    }

    public function list(int $limit = 20): ApiResponse {
        $rows = $this->notifications->latest($this->user->id, max(1, min($limit, 50)));
        return new ApiResponse(true, 200, "Notifications loaded.", [
            'unread' => $this->notifications->unreadCount($this->user->id),
            'notifications' => array_map(fn($r) => [
                'id'         => (int) $r['id'],
                'type'       => $r['type'],
                'title'      => $r['title'],
                'message'    => $r['message'],
                'link'       => $r['link'],
                'is_read'    => (bool) $r['is_read'],
                'created_at' => $r['created_at'],
            ], $rows),
        ]);
    }

    public function read(int $id): ApiResponse {
        if (!$this->notifications->markRead($id, $this->user->id)) {
            return new ApiResponse(false, 404, "Notification not found.", []);
        }
        return new ApiResponse(true, 200, "Marked as read.", ['unread' => $this->notifications->unreadCount($this->user->id)]);
    }

    public function readAll(): ApiResponse {
        $count = $this->notifications->markAllRead($this->user->id);
        return new ApiResponse(true, 200, "All caught up.", ['marked' => $count, 'unread' => 0]);
    }
}
