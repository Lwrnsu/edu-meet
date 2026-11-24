<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../models/Announcement.php';
require_once __DIR__ . '/../models/Notification.php';

class AnnouncementController extends BaseController {
    public function index(array $query = []): ApiResponse {
        try {
            $status = array_key_exists('status', $query) && $query['status'] !== ''
                ? (string) $query['status']
                : 'published';
            $scopeType = isset($query['scope_type']) && $query['scope_type'] !== ''
                ? (string) $query['scope_type']
                : null;
            $sectionId = isset($query['section_id']) && $query['section_id'] !== ''
                ? (int) $query['section_id']
                : null;
            $programId = isset($query['program_id']) && $query['program_id'] !== ''
                ? (int) $query['program_id']
                : null;
            $departmentId = isset($query['department_id']) && $query['department_id'] !== ''
                ? (int) $query['department_id']
                : null;
            $viewerUserId = isset($query['user_id']) && $query['user_id'] !== ''
                ? (int) $query['user_id']
                : null;
            $viewerRole = isset($query['role']) && $query['role'] !== ''
                ? (string) $query['role']
                : null;

            $items = Announcement::findAll(
                $status,
                $scopeType,
                $sectionId,
                $programId,
                $departmentId,
                $viewerUserId,
                $viewerRole
            );
            $data = array_map(fn(Announcement $a) => $a->toArray(), $items);

            return $this->ok(200, "Announcements retrieved successfully.", [
                'announcements' => $data,
                'count' => count($data),
            ]);
        } catch (InvalidArgumentException $e) {
            return $this->fail(400, $e->getMessage());
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to retrieve announcements.", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function show(int $id): ApiResponse {
        try {
            if ($id <= 0) {
                return $this->fail(400, "Invalid announcement ID.");
            }

            $announcement = Announcement::findById($id);
            if ($announcement === null) {
                return $this->fail(404, "Announcement not found.");
            }

            return $this->ok(200, "Announcement retrieved successfully.", [
                'announcement' => $announcement->toArray(),
            ]);
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to retrieve announcement.", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function store(array $input): ApiResponse {
        try {
            $userId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
            $role = isset($input['role']) ? (string) $input['role'] : '';
            $title = isset($input['title']) ? (string) $input['title'] : '';
            $body = isset($input['body'])
                ? (string) $input['body']
                : (isset($input['content']) ? (string) $input['content'] : '');
            $isPinned = isset($input['is_pinned'])
                ? filter_var($input['is_pinned'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
                : false;
            $status = isset($input['status']) && (string) $input['status'] !== ''
                ? (string) $input['status']
                : 'published';

            $attachmentName = isset($input['attachment_name']) && trim((string) $input['attachment_name']) !== ''
                ? trim((string) $input['attachment_name'])
                : null;
            $attachmentUrl = isset($input['attachment_url']) && trim((string) $input['attachment_url']) !== ''
                ? trim((string) $input['attachment_url'])
                : null;

            $targets = [];
            if (isset($input['targets']) && is_array($input['targets'])) {
                $targets = $input['targets'];
            } elseif (isset($input['target']) && is_array($input['target'])) {
                $targets = [$input['target']];
            }

            $actorPermissions = isset($input['actor_permissions']) && is_array($input['actor_permissions'])
                ? $input['actor_permissions']
                : null;

            $announcement = new Announcement(
                userId: $userId,
                role: $role,
                title: $title,
                body: $body,
                targets: $targets,
                isPinned: $isPinned,
                status: $status,
                actorPermissions: $actorPermissions,
                attachmentName: $attachmentName,
                attachmentUrl: $attachmentUrl
            );
            $announcement->save();

            $notificationsCreated = 0;
            $recipientIds = isset($input['recipient_ids']) && is_array($input['recipient_ids']) && $input['recipient_ids'] !== []
                ? $input['recipient_ids']
                : $announcement->resolveRecipientUserIds();

            if ($announcement->getStatus() === 'published' && $recipientIds !== []) {
                $notificationsCreated = Notification::createForRecipients(
                    (int) $announcement->getAnnouncementId(),
                    $announcement->getTitle(),
                    $recipientIds
                );
            }

            return $this->ok(201, "Announcement created successfully.", [
                'announcement' => $announcement->toArray(),
                'notifications_created' => $notificationsCreated,
            ]);
        } catch (InvalidArgumentException $e) {
            return $this->fail(400, $e->getMessage());
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to create announcement.", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function update(int $id, array $input): ApiResponse {
        try {
            if ($id <= 0) {
                return $this->fail(400, "Invalid announcement ID.");
            }

            $announcement = Announcement::findById($id);
            if ($announcement === null) {
                return $this->fail(404, "Announcement not found.");
            }

            if (array_key_exists('title', $input)) {
                $announcement->setTitle((string) $input['title']);
            }
            if (array_key_exists('body', $input)) {
                $announcement->setBody((string) $input['body']);
            } elseif (array_key_exists('content', $input)) {
                $announcement->setBody((string) $input['content']);
            }
            if (array_key_exists('is_pinned', $input)) {
                $pinned = filter_var($input['is_pinned'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($pinned === null) {
                    return $this->fail(400, "is_pinned must be a boolean value.");
                }
                $announcement->setIsPinned($pinned);
            }
            if (array_key_exists('attachment_name', $input)) {
                $name = $input['attachment_name'] !== null && trim((string) $input['attachment_name']) !== ''
                    ? trim((string) $input['attachment_name'])
                    : null;
                $announcement->setAttachmentName($name);
            }
            if (array_key_exists('attachment_url', $input)) {
                $url = $input['attachment_url'] !== null && trim((string) $input['attachment_url']) !== ''
                    ? trim((string) $input['attachment_url'])
                    : null;
                $announcement->setAttachmentUrl($url);
            }
            if (array_key_exists('targets', $input) && is_array($input['targets'])) {
                $permissions = isset($input['actor_permissions']) && is_array($input['actor_permissions'])
                    ? $input['actor_permissions']
                    : null;
                $announcement->setTargets($input['targets'], $permissions);
            }
            if (array_key_exists('status', $input)) {
                $announcement->setStatus((string) $input['status']);
            }

            $announcement->save();

            $notificationsCreated = 0;
            $recipientIds = isset($input['recipient_ids']) && is_array($input['recipient_ids'])
                ? $input['recipient_ids']
                : [];
            if ($announcement->getStatus() === 'published' && $recipientIds !== []) {
                $notificationsCreated = Notification::createForRecipients(
                    (int) $announcement->getAnnouncementId(),
                    $announcement->getTitle(),
                    $recipientIds
                );
            }

            return $this->ok(200, "Announcement updated successfully.", [
                'announcement' => $announcement->toArray(),
                'notifications_created' => $notificationsCreated,
            ]);
        } catch (InvalidArgumentException $e) {
            return $this->fail(400, $e->getMessage());
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to update announcement.", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function destroy(int $id): ApiResponse {
        try {
            if ($id <= 0) {
                return $this->fail(400, "Invalid announcement ID.");
            }

            $announcement = Announcement::findById($id);
            if ($announcement === null) {
                return $this->fail(404, "Announcement not found.");
            }

            $deleted = $announcement->delete();
            if (!$deleted) {
                return $this->fail(500, "Failed to delete announcement.");
            }

            return $this->ok(200, "Announcement deleted successfully.", [
                'deleted_id' => $id,
            ]);
        } catch (Throwable $e) {
            return $this->fail(500, "Failed to delete announcement.", [
                'error' => $e->getMessage(),
            ]);
        }
    }
}