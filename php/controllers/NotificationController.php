<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/Notification.php';

class NotificationController extends BaseController {
    public function index(array $query = []): ApiResponse {
        try {
            $userId = isset($query['user_id']) ? (int) $query['user_id'] : 0;
            $unreadOnly = isset($query['unread_only'])
                ? (filter_var($query['unread_only'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false)
                : false;
            $limit = isset($query['limit']) ? (int) $query['limit'] : 30;

            $items = Notification::findForUser($userId, $unreadOnly, $limit);
            $unreadCount = Notification::countUnreadForUser($userId);

            return $this->ok(200, "Notifications retrieved successfully.", [
                'notifications' => array_map(fn(Notification $n) => $n->toArray(), $items),
                'unread_count'  => $unreadCount,
            ]);
        } catch (InvalidArgumentException $e) {
            return $this->fail(400, $e->getMessage());
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to retrieve notifications.", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function markRead(array $input): ApiResponse {
        try {
            $userId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
            $markAll = isset($input['all'])
                ? (filter_var($input['all'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false)
                : false;

            if ($userId <= 0) {
                return $this->fail(400, "Valid user_id is required.");
            }

            if ($markAll) {
                $updatedCount = Notification::markAllAsRead($userId);
                return $this->ok(200, "All notifications marked as read.", [
                    'updated_count' => $updatedCount,
                    'unread_count'  => 0,
                ]);
            }

            $notificationId = isset($input['notification_id']) ? (int) $input['notification_id'] : 0;
            $updated = Notification::markAsRead($notificationId, $userId);
            if (!$updated) {
                return $this->fail(404, "Notification not found for this user.");
            }

            $unreadCount = Notification::countUnreadForUser($userId);
            return $this->ok(200, "Notification marked as read.", [
                'notification_id' => $notificationId,
                'unread_count'    => $unreadCount,
            ]);
        } catch (InvalidArgumentException $e) {
            return $this->fail(400, $e->getMessage());
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to update notification status.", [
                'error' => $e->getMessage(),
            ]);
        }
    }
}