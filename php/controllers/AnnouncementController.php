<?php
/*
    SCHOOL ANNOUNCEMENTS — the dashboard announcements (not tied to one class).
    Ported from MANGALINDAN's announcements module.

    feed()      dashboard list, pinned first, 10 per page
    show()      one announcement
    targets()   Target Audience choices for the logged-in poster
    create()    post (or save as draft) with an optional attachment
    update()    edit, change audience, pin, publish/archive, swap attachment
    delete()
    attachment() the file, after checking the viewer may see it

    Rules:
    - Admins, deans, program chairs and faculty post; students only read.
      What each may target is in services/AnnouncementScope.php.
    - Students see published announcements that reach their sections
      (or the whole school). Staff see published ones plus their own drafts.
      Admins see everything.
    - Edit/delete: the author or an admin.
    - Publishing notifies every student it reaches (once, the first time).
*/
require_once __DIR__ . "/../models/ApiResponse.php";
require_once __DIR__ . "/../models/Announcement.php";
require_once __DIR__ . "/../services/ClassAccess.php";
require_once __DIR__ . "/../services/AnnouncementScope.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../services/Notifier.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";

class AnnouncementController {
    public const PAGE_SIZE = 10;
    public const TITLE_MAX = 150;

    private Announcement $announcements;
    private ClassAccess $access;
    private AnnouncementScope $scope;

    public function __construct(
        private PDO $pdo,
        private CurrentUser $user,
        private FileStorage $storage
    ) {
        $this->announcements = new Announcement($pdo);
        $this->access = new ClassAccess($pdo);
        $this->scope = new AnnouncementScope($this->access);
    }

    public function feed(int $page = 1, ?string $status = null, bool $mine = false): ApiResponse {
        $page = max(1, $page);
        if ($status !== null && !in_array($status, Announcement::STATUSES, true)) {
            return new ApiResponse(false, 400, "Status must be draft, published or archived.", []);
        }
        $isStudent = $this->user->is('student');
        $result = $this->announcements->feed(
            $isStudent ? $this->user->id : null,
            $this->user->isAdmin() && !$mine ? null : $this->user->id,
            $isStudent ? null : $status,
            !$isStudent && $mine,
            $page,
            self::PAGE_SIZE
        );
        $authors = $this->access->userNames(array_column($result['rows'], 'author_id'));
        return new ApiResponse(true, 200, "Announcements loaded.", [
            'announcements' => array_map(fn($r) => $this->format($r, $authors), $result['rows']),
            'page'          => $page,
            'has_more'      => $result['has_more'],
            'can_post'      => AnnouncementScope::canPost($this->user),
        ]);
    }

    public function show(int $id): ApiResponse {
        $row = $this->announcements->find($id);
        if ($row === null || !$this->canView($row)) {
            return new ApiResponse(false, 404, "Announcement not found.", []);
        }
        return new ApiResponse(true, 200, "Announcement loaded.", [
            'announcement' => $this->format($row, $this->access->userNames([$row['author_id']])),
        ]);
    }

    public function targets(): ApiResponse {
        if (!AnnouncementScope::canPost($this->user)) {
            return new ApiResponse(false, 403, "Students can't post announcements.", []);
        }
        return new ApiResponse(true, 200, "Target audience choices loaded.", [
            'options' => $this->scope->options($this->user),
        ]);
    }

    // $files: FileStorage::normalize() list, at most one.
    public function create(string $title, string $body, array $targets, bool $isPinned, string $status, array $files): ApiResponse {
        if (!AnnouncementScope::canPost($this->user)) {
            return new ApiResponse(false, 403, "Students can't post announcements.", []);
        }
        $errors = $this->validate($title, $body, $status, ['draft', 'published'], $files);
        try {
            $clean = $this->scope->authorize($this->user, $targets);
        } catch (InvalidArgumentException $e) {
            $errors[] = $e->getMessage();
        }
        if ($errors !== []) {
            return new ApiResponse(false, 400, $errors[0], ['errors' => $errors]);
        }

        $file = $files === [] ? null : $this->storage->store($files[0]);
        try {
            $id = $this->announcements->create([
                'author_id'   => $this->user->id,
                'author_role' => $this->user->role,
                'title'       => trim($title),
                'body'        => trim($body),
                'is_pinned'   => $isPinned,
                'status'      => $status,
                'attachment'  => $file,
            ], $clean);
        } catch (Throwable $e) {
            if ($file !== null) {
                $this->storage->delete($file['stored_name']);
            }
            throw $e;
        }

        $notified = $status === 'published' ? $this->notify($id, trim($title), $clean) : 0;
        $response = $this->show($id);
        return new ApiResponse(true, 201,
            $status === 'published' ? "Announcement posted." : "Draft saved.",
            $response->body + ['notified' => $notified]);
    }

    /*
        $fields may hold title, body, is_pinned, status, targets — only those
        are changed. $files replaces the attachment; $removeAttachment drops it.
    */
    public function update(int $id, array $fields, array $files = [], bool $removeAttachment = false): ApiResponse {
        $row = $this->announcements->find($id);
        if ($row === null || !$this->canView($row)) {
            return new ApiResponse(false, 404, "Announcement not found.", []);
        }
        if (!$this->canEdit($row)) {
            return new ApiResponse(false, 403, "Only the author or an admin can edit this announcement.", []);
        }

        $title = array_key_exists('title', $fields) ? (string) $fields['title'] : $row['title'];
        $body = array_key_exists('body', $fields) ? (string) $fields['body'] : $row['body'];
        $status = array_key_exists('status', $fields) ? (string) $fields['status'] : $row['status'];
        $errors = $this->validate($title, $body, $status, Announcement::STATUSES, $files);
        $targets = null;
        if (array_key_exists('targets', $fields)) {
            try {
                $targets = $this->scope->authorize($this->user, (array) $fields['targets']);
            } catch (InvalidArgumentException $e) {
                $errors[] = $e->getMessage();
            }
        }
        if ($errors !== []) {
            return new ApiResponse(false, 400, $errors[0], ['errors' => $errors]);
        }

        $changes = ['title' => trim($title), 'body' => trim($body), 'status' => $status];
        if (array_key_exists('is_pinned', $fields)) {
            $changes['is_pinned'] = (bool) $fields['is_pinned'];
        }
        $attachment = false;
        if ($files !== []) {
            $attachment = $this->storage->store($files[0]);
        } elseif ($removeAttachment) {
            $attachment = null;
        }

        $this->announcements->update($id, $changes, $targets, $attachment);
        if ($attachment !== false && $row['attachment_stored'] !== null) {
            $this->storage->delete($row['attachment_stored']);
        }

        // First time it goes live → tell the students.
        $notified = 0;
        if ($status === 'published' && $row['published_at'] === null) {
            $notified = $this->notify($id, trim($title), $targets ?? $row['targets']);
        }
        return new ApiResponse(true, 200, "Announcement updated.", $this->show($id)->body + ['notified' => $notified]);
    }

    public function delete(int $id): ApiResponse {
        $row = $this->announcements->find($id);
        if ($row === null || !$this->canView($row)) {
            return new ApiResponse(false, 404, "Announcement not found.", []);
        }
        if (!$this->canEdit($row)) {
            return new ApiResponse(false, 403, "Only the author or an admin can delete this announcement.", []);
        }
        $this->announcements->delete($id);
        if ($row['attachment_stored'] !== null) {
            $this->storage->delete($row['attachment_stored']);
        }
        return new ApiResponse(true, 200, "Announcement deleted.", ['id' => $id]);
    }

    /*
        The attachment to stream: ['path', 'name', 'mime'], or an ApiResponse error.
        $inline is refused for types the browser can't show.
    */
    public function attachment(int $id, bool $inline): array|ApiResponse {
        $row = $this->announcements->find($id);
        if ($row === null || !$this->canView($row) || $row['attachment_stored'] === null) {
            return new ApiResponse(false, 404, "Attachment not found.", []);
        }
        if ($inline && !in_array($row['attachment_ext'], FileStorage::VIEWABLE, true)) {
            return new ApiResponse(false, 415, "This file type can't be previewed. Download it instead.", []);
        }
        return [
            'path' => $this->storage->path($row['attachment_stored']),
            'name' => $row['attachment_name'],
            'mime' => $row['attachment_mime'],
        ];
    }

    // ---------- helpers ----------

    private function canView(array $row): bool {
        if ($this->user->isAdmin() || (int) $row['author_id'] === $this->user->id) {
            return true;
        }
        if ($row['status'] !== 'published') {
            return false;
        }
        return !$this->user->is('student') || $this->announcements->reachesStudent((int) $row['id'], $this->user->id);
    }

    private function canEdit(array $row): bool {
        return $this->user->isAdmin() || (int) $row['author_id'] === $this->user->id;
    }

    private function validate(string $title, string $body, string $status, array $statuses, array $files): array {
        $errors = [];
        if (trim($title) === '') {
            $errors[] = "Title is required.";
        } elseif (mb_strlen(trim($title)) > self::TITLE_MAX) {
            $errors[] = "Title can be at most " . self::TITLE_MAX . " characters.";
        }
        if (trim($body) === '') {
            $errors[] = "Message is required.";
        }
        if (!in_array($status, $statuses, true)) {
            $errors[] = "Status must be " . implode(' or ', $statuses) . ".";
        }
        if (count($files) > 1) {
            $errors[] = "An announcement can have only one attachment.";
        } elseif ($files !== [] && ($fileError = $this->storage->validate($files[0])) !== null) {
            $errors[] = $fileError;
        }
        return $errors;
    }

    private function notify(int $id, string $title, array $targets): int {
        return (new Notifier($this->pdo, $this->user->id))
            ->schoolAnnouncementPublished($id, $title, $this->scope->labels($targets));
    }

    private function format(array $r, array $authors): array {
        $id = (int) $r['id'];
        $targets = $r['targets'];
        return [
            'id'           => $id,
            'title'        => $r['title'],
            'body'         => $r['body'],
            'is_pinned'    => (bool) $r['is_pinned'],
            'status'       => $r['status'],
            'author'       => [
                'id'   => (int) $r['author_id'],
                'name' => $authors[(int) $r['author_id']] ?? 'Unknown',
                'role' => $r['author_role'],
            ],
            'targets'      => array_map(fn($t) => [
                'scope_type'    => $t['scope_type'],
                'department_id' => $t['department_id'],
                'program_id'    => $t['program_id'],
                'year_level'    => $t['year_level'],
                'section_id'    => $t['block_id'],
                'token'         => AnnouncementScope::token($t),
                'label'         => $this->scope->label($t),
            ], $targets),
            'target_label' => $this->scope->labels($targets),
            'attachment'   => $r['attachment_stored'] === null ? null : [
                'name'         => $r['attachment_name'],
                'extension'    => $r['attachment_ext'],
                'size_label'   => FileStorage::sizeLabel((int) $r['attachment_size']),
                'viewable'     => in_array($r['attachment_ext'], FileStorage::VIEWABLE, true),
                'view_url'     => "api/announcements.php?id=$id&action=view",
                'download_url' => "api/announcements.php?id=$id&action=download",
            ],
            'can_edit'     => $this->canEdit($r),
            'published_at' => $r['published_at'],
            'created_at'   => $r['created_at'],
            'updated_at'   => $r['updated_at'],
        ];
    }
}
