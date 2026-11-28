<?php
/*
    BLOGS & ANNOUNCEMENTS — what each screen calls.

    B1 Class Feed (Student)       feed(), show()
    B2 Class Feed (Faculty)       feed(), update(), delete()
    B3 Create Post modal          create()  (sections come from ResourceController::blocks)

    Rules (from the flowchart):
    - Announcements and blogs are posted right away: Create → Information
      Details → Target Audience → Post → saved and visible to students.
    - Students only see posts meant for all sections or their own section.
    - Only the author, or the dean of the class's department, can edit or delete a post.
    - The feed loads 10 posts at a time (from the student dashboard flowchart).
*/
require_once __DIR__ . "/../models/ApiResponse.php";
require_once __DIR__ . "/../models/Post.php";
require_once __DIR__ . "/../models/ClassFile.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../services/ClassAccess.php";
require_once __DIR__ . "/../services/Notifier.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/ResourceController.php";

class PostController {
    public const PAGE_SIZE = 10;
    public const MAX_ATTACHMENTS = 5;

    private Post $posts;
    private ClassFile $files;
    private ClassAccess $access;
    private ResourceController $resources;

    public function __construct(
        private PDO $pdo,
        private CurrentUser $user,
        private FileStorage $storage
    ) {
        $this->posts = new Post($pdo);
        $this->files = new ClassFile($pdo);
        $this->access = new ClassAccess($pdo);
        $this->resources = new ResourceController($pdo, $user, $storage);
    }

    /*
        B1 / B2 · Class Feed, newest first, 10 per page.
        $section (faculty only): show what one section sees.
    */
    public function feed(int $classId, int $page = 1, ?string $type = null, ?int $section = null): ApiResponse {
        if (!$this->access->classExists($classId)) {
            return new ApiResponse(false, 404, "Class not found.", []);
        }
        if ($type !== null && !in_array($type, Post::TYPES, true)) {
            return new ApiResponse(false, 400, "Post type must be announcement or blog.", []);
        }
        $canManage = $this->access->canManage($this->user, $classId);
        if ($canManage) {
            $onlyBlock = $section ?: false;
        } else {
            $enrollment = $this->access->enrollment($this->user, $classId);
            if (!$enrollment['enrolled']) {
                return $this->forbidden();
            }
            $onlyBlock = $enrollment['block_id'];
        }
        $page = max(1, $page);
        // Ask for one extra row to know whether another page exists.
        $rows = $this->posts->feed($classId, $onlyBlock, self::PAGE_SIZE + 1, ($page - 1) * self::PAGE_SIZE, $type);
        $hasMore = count($rows) > self::PAGE_SIZE;
        return new ApiResponse(true, 200, $rows === [] ? "No posts yet." : "Posts loaded.", [
            'class'    => $this->access->classDetails($classId),
            'can_post' => $canManage,
            'page'     => $page,
            'has_more' => $hasMore,
            'posts'    => $this->format(array_slice($rows, 0, self::PAGE_SIZE)),
        ]);
    }

    // Open one post (full message + attachments)
    public function show(int $postId): ApiResponse {
        $post = $this->posts->getById($postId);
        if ($post === null || !$this->canSee($post)) {
            return new ApiResponse(false, 404, "Post not found.", []);
        }
        return new ApiResponse(true, 200, "Post loaded.", ['post' => $this->format([$post])[0]]);
    }

    // B3 · Create Post → Information Details → Target Audience → Post
    public function create(int $classId, string $title, string $type, string $message, array $blockIds, array $uploads): ApiResponse {
        if (!$this->access->canManage($this->user, $classId)) {
            return $this->forbidden();
        }
        $invalid = $this->formErrors($title, $type, $message, $uploads, 0);
        if ($invalid !== null) {
            return $invalid;
        }
        try {
            [$title, $type, $message] = Post::validate($title, $type, $message);
            $blockIds = ResourceController::ids($blockIds);
            $this->access->assertBlocksInClass($classId, $blockIds);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        }

        $this->pdo->beginTransaction();
        try {
            $postId = $this->posts->create($classId, $this->user->id, $type, $title, $message);
            $this->posts->setAudience($postId, $blockIds);
            $this->resources->saveFiles($classId, $uploads, 'attachment', $postId);
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        $saved = $this->posts->getById($postId);
        (new Notifier($this->pdo, $this->user->id))->postPublished($saved, $blockIds);
        return new ApiResponse(true, 201, ucfirst($type) . " posted.", ['post' => $this->format([$saved])[0]]);
    }

    /*
        B4 · Edit post. Fields left as null stay the same.
        $newUploads adds attachments; $removeFileIds removes them.
    */
    public function update(
        int $postId,
        ?string $title,
        ?string $type,
        ?string $message,
        ?array $blockIds,
        array $newUploads = [],
        array $removeFileIds = []
    ): ApiResponse {
        $post = $this->posts->getById($postId);
        if ($post === null || !$this->canSee($post)) {
            return new ApiResponse(false, 404, "Post not found.", []);
        }
        if (!$this->canEdit($post)) {
            return new ApiResponse(false, 403, "Only the author or the dean can edit this post.", []);
        }
        $classId = (int) $post['class_id'];
        $existing = $this->files->attachmentsFor([$postId])[$postId] ?? [];
        $removeFileIds = array_values(array_intersect(
            ResourceController::ids($removeFileIds),
            array_map(fn($f) => (int) $f['id'], $existing)
        ));
        $title ??= $post['title'];
        $type ??= $post['type'];
        $message ??= $post['message'];
        $invalid = $this->formErrors($title, $type, $message, $newUploads, count($existing) - count($removeFileIds));
        if ($invalid !== null) {
            return $invalid;
        }
        try {
            [$title, $type, $message] = Post::validate($title, $type, $message);
            if ($blockIds !== null) {
                $blockIds = ResourceController::ids($blockIds);
                $this->access->assertBlocksInClass($classId, $blockIds);
            }
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        }

        $removed = array_filter($existing, fn($f) => in_array((int) $f['id'], $removeFileIds, true));
        $this->pdo->beginTransaction();
        try {
            $this->posts->update($postId, $type, $title, $message);
            if ($blockIds !== null) {
                $this->posts->setAudience($postId, $blockIds);
            }
            foreach ($removed as $file) {
                $this->files->delete((int) $file['id']);
            }
            $this->resources->saveFiles($classId, $newUploads, 'attachment', $postId);
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
        // Delete from disk only after the database change is saved.
        foreach ($removed as $file) {
            $this->storage->delete($file['stored_name']);
        }
        return new ApiResponse(true, 200, "Post updated.", ['post' => $this->format([$this->posts->getById($postId)])[0]]);
    }

    // B5 · Delete post (and its attachments)
    public function delete(int $postId): ApiResponse {
        $post = $this->posts->getById($postId);
        if ($post === null || !$this->canSee($post)) {
            return new ApiResponse(false, 404, "Post not found.", []);
        }
        if (!$this->canEdit($post)) {
            return new ApiResponse(false, 403, "Only the author or the dean can delete this post.", []);
        }
        $attachments = $this->files->attachmentsFor([$postId])[$postId] ?? [];
        $this->pdo->beginTransaction();
        try {
            foreach ($attachments as $file) {
                $this->files->delete((int) $file['id']);
            }
            $this->posts->delete($postId);
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        foreach ($attachments as $file) {
            $this->storage->delete($file['stored_name']);
        }
        return new ApiResponse(true, 200, "\"{$post['title']}\" was deleted.", [
            'id' => $postId,
            'attachments_removed' => count($attachments),
        ]);
    }

    // Shapes posts into what the feed cards display.
    private function format(array $rows): array {
        $ids = array_map(fn($r) => (int) $r['id'], $rows);
        $audience = $this->posts->audienceFor($ids);
        $attachments = $this->files->attachmentsFor($ids);
        $names = $this->access->userNames(array_column($rows, 'author_id'));
        return array_map(function ($r) use ($audience, $attachments, $names) {
            $id = (int) $r['id'];
            $blocks = $audience[$id] ?? [];
            $message = $r['message'];
            $excerpt = strlen($message) > 160 ? rtrim(substr($message, 0, 157)) . '…' : $message;
            return [
                'id'            => $id,
                'class_id'      => (int) $r['class_id'],
                'type'          => $r['type'],
                'title'         => $r['title'],
                'message'       => $message,
                'excerpt'       => $excerpt,
                'author'        => ['id' => (int) $r['author_id'], 'name' => $names[(int) $r['author_id']] ?? null],
                'created_at'    => $r['created_at'],
                'updated_at'    => $r['updated_at'],
                'visible_to'    => $blocks,
                'visible_label' => ClassAccess::audienceLabel($blocks),
                'attachments'   => $this->resources->format($attachments[$id] ?? []),
                'can_edit'      => $this->canEdit($r),
            ];
        }, $rows);
    }

    // Author (still managing the class) or the dean of the class's department.
    private function canEdit(array $post): bool {
        $classId = (int) $post['class_id'];
        if (!$this->access->canManage($this->user, $classId)) {
            return false;
        }
        return $this->user->is('college_dean') || (int) $post['author_id'] === $this->user->id;
    }

    private function canSee(array $post): bool {
        $classId = (int) $post['class_id'];
        if ($this->access->canManage($this->user, $classId)) {
            return true;
        }
        $enrollment = $this->access->enrollment($this->user, $classId);
        return $enrollment['enrolled']
            && $this->posts->visibleToBlock((int) $post['id'], $enrollment['block_id']);
    }

    /*
        B3b · All form problems in one response:
        body.fields = errors under Title / Message, body.errors = attachment problems.
    */
    private function formErrors(string $title, string $type, string $message, array $uploads, int $alreadyAttached): ?ApiResponse {
        $fields = Post::fieldErrors($title, $type, $message);
        $fileErrors = array_values(array_filter(array_map(fn($f) => $this->storage->validate($f), $uploads)));
        if (count($uploads) + $alreadyAttached > self::MAX_ATTACHMENTS) {
            $fileErrors[] = "A post can have up to " . self::MAX_ATTACHMENTS . " attachments.";
        }
        if ($fields === [] && $fileErrors === []) {
            return null;
        }
        $first = $fields !== [] ? reset($fields) : $fileErrors[0];
        return new ApiResponse(false, 400, $first, ['fields' => $fields, 'errors' => $fileErrors]);
    }

    private function forbidden(): ApiResponse {
        return new ApiResponse(false, 403, "You don't have access to this class.", []);
    }
}
