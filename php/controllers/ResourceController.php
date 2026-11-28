<?php
/*
    FILE MANAGEMENT — what each screen calls.

    F1 Resources (Student)        list()            search + file type filter
    F2 Resources (Faculty)        list(), update(), delete()
    F3 Upload Resources modal     upload()
    F4 Edit Resource modal        update()  (rename)
    F5 Delete confirm             delete()
    F6 View File                  show(), openFile()  (view inline / download)

    Resources belong to the class: every student enrolled in the class sees
    every resource. There is no per-section target audience for files.

    Every method returns an ApiResponse (response, code, message, body),
    except openFile(), which returns the file to stream on success.
*/
require_once __DIR__ . "/../models/ApiResponse.php";
require_once __DIR__ . "/../models/ClassFile.php";
require_once __DIR__ . "/../models/Post.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../services/ClassAccess.php";
require_once __DIR__ . "/../services/Notifier.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";

class ResourceController {
    public const MAX_FILES_PER_UPLOAD = 10;

    private ClassFile $files;
    private Post $posts;
    private ClassAccess $access;

    public function __construct(
        private PDO $pdo,
        private CurrentUser $user,
        private FileStorage $storage
    ) {
        $this->files = new ClassFile($pdo);
        $this->posts = new Post($pdo);
        $this->access = new ClassAccess($pdo);
    }

    // Sections of the class (Department → Program → Section), for the Create Post audience picker.
    public function blocks(int $classId): ApiResponse {
        if (!$this->access->canManage($this->user, $classId)) {
            return $this->forbidden();
        }
        $sections = $this->access->classBlocks($classId);
        return new ApiResponse(true, 200, "Sections loaded.", [
            'blocks' => $sections,                      // flat list, sorted
            'tree'   => ClassAccess::tree($sections),   // Department → Program → Section
        ]);
    }

    // F1 / F2 · Resources table: faculty of the class and every enrolled student see all of them.
    public function list(int $classId, ?string $search = null, ?string $type = null): ApiResponse {
        if (!$this->access->classExists($classId)) {
            return new ApiResponse(false, 404, "Class not found.", []);
        }
        $canManage = $this->access->canManage($this->user, $classId);
        if (!$canManage && !$this->access->enrollment($this->user, $classId)['enrolled']) {
            return $this->forbidden();
        }
        try {
            $rows = $this->files->listResources($classId, $search, $type);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        }
        return new ApiResponse(true, 200, "Resources loaded.", [
            'class'      => ['id' => $classId, 'name' => $this->access->classNames([$classId])[$classId] ?? ''],
            'can_manage' => $canManage,
            'resources'  => $this->format($rows),
        ]);
    }

    // F3 · Upload Resources → Files → Post (shared with the whole class)
    public function upload(int $classId, array $uploads): ApiResponse {
        if (!$this->access->canManage($this->user, $classId)) {
            return $this->forbidden();
        }
        if ($uploads === []) {
            return new ApiResponse(false, 400, "Choose at least one file to upload.", []);
        }
        if (count($uploads) > self::MAX_FILES_PER_UPLOAD) {
            return new ApiResponse(false, 400, "You can upload up to " . self::MAX_FILES_PER_UPLOAD . " files at a time.", []);
        }

        // Check every file first, so a bad file doesn't leave half an upload behind.
        $errors = array_values(array_filter(array_map(fn($f) => $this->storage->validate($f), $uploads)));
        if ($errors !== []) {
            return new ApiResponse(false, 400, "Some files can't be uploaded.", ['errors' => $errors]);
        }

        $ids = $this->saveFiles($classId, $uploads, 'resource', null);
        $rows = array_map(fn($id) => $this->files->getById($id), $ids);
        (new Notifier($this->pdo, $this->user->id))->resourcesUploaded($classId, array_column($rows, 'display_name'));
        $count = count($ids);
        return new ApiResponse(true, 201, $count === 1 ? "1 file uploaded." : "$count files uploaded.", ['resources' => $this->format($rows)]);
    }

    // F4 · Edit button: rename the file
    public function update(int $fileId, ?string $displayName): ApiResponse {
        $file = $this->files->getById($fileId);
        if ($file === null || $file['context'] !== 'resource') {
            return new ApiResponse(false, 404, "Resource not found.", []);
        }
        if (!$this->access->canManage($this->user, (int) $file['class_id'])) {
            return $this->forbidden();
        }
        if ($displayName !== null) {
            try {
                $this->files->rename($fileId, $displayName);
            } catch (InvalidArgumentException $e) {
                return new ApiResponse(false, 400, $e->getMessage(), []);
            }
        }
        return new ApiResponse(true, 200, "Resource updated.", ['resource' => $this->format([$this->files->getById($fileId)])[0]]);
    }

    // F5 · Delete confirm
    public function delete(int $fileId): ApiResponse {
        $file = $this->files->getById($fileId);
        if ($file === null || $file['context'] !== 'resource') {
            return new ApiResponse(false, 404, "Resource not found.", []);
        }
        if (!$this->access->canManage($this->user, (int) $file['class_id'])) {
            return $this->forbidden();
        }
        $this->files->delete($fileId);
        $this->storage->delete($file['stored_name']);
        return new ApiResponse(true, 200, "\"{$file['display_name']}\" was deleted.", ['id' => $fileId]);
    }

    // F6 · View File page: file details for the side card
    public function show(int $fileId): ApiResponse {
        $file = $this->files->getById($fileId);
        if ($file === null || !$this->canOpen($file)) {
            // 404 either way, so people outside the class can't probe for files
            return new ApiResponse(false, 404, "File not found.", []);
        }
        return new ApiResponse(true, 200, "File loaded.", ['file' => $this->format([$file])[0]]);
    }

    /*
        F6 · View (inline) or Download.
        Returns ['path', 'name', 'mime', 'inline'] to stream, or an ApiResponse error.
    */
    public function openFile(int $fileId, bool $inline): array|ApiResponse {
        $file = $this->files->getById($fileId);
        if ($file === null || !$this->canOpen($file)) {
            return new ApiResponse(false, 404, "File not found.", []);
        }
        if ($inline && !in_array($file['extension'], FileStorage::VIEWABLE, true)) {
            return new ApiResponse(false, 415, "This file type can't be previewed. Download it instead.", []);
        }
        return [
            'path'   => $this->storage->path($file['stored_name']),
            'name'   => $file['original_name'],
            'mime'   => $file['mime_type'],
            'inline' => $inline,
        ];
    }

    /*
        Saves uploads to disk and the database. Used for resources here and
        for post attachments by PostController. If anything fails, files
        already written are removed again.
    */
    public function saveFiles(int $classId, array $uploads, string $context, ?int $postId): array {
        $stored = [];
        $ownTransaction = !$this->pdo->inTransaction();
        try {
            foreach ($uploads as $upload) {
                $stored[] = $this->storage->store($upload);
            }
            if ($ownTransaction) {
                $this->pdo->beginTransaction();
            }
            $ids = [];
            foreach ($stored as $file) {
                $ids[] = $this->files->create($classId, $this->user->id, $file, $context, $postId);
            }
            if ($ownTransaction) {
                $this->pdo->commit();
            }
            return $ids;
        } catch (Throwable $e) {
            if ($ownTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            foreach ($stored as $file) {
                $this->storage->delete($file['stored_name']);
            }
            throw $e;
        }
    }

    // Shapes database rows into what the tables and cards display.
    public function format(array $rows): array {
        $names = $this->access->userNames(array_column($rows, 'uploaded_by'));
        return array_map(function ($r) use ($names) {
            $id = (int) $r['id'];
            return [
                'id'            => $id,
                'name'          => $r['display_name'],
                'original_name' => $r['original_name'],
                'type'          => strtoupper($r['extension']),
                'size_bytes'    => (int) $r['size_bytes'],
                'size_label'    => FileStorage::sizeLabel((int) $r['size_bytes']),
                'uploaded_by'   => ['id' => (int) $r['uploaded_by'], 'name' => $names[(int) $r['uploaded_by']] ?? null],
                'uploaded_at'   => $r['created_at'],
                'viewable'      => in_array($r['extension'], FileStorage::VIEWABLE, true),
                'view_url'      => "api/resources.php?id=$id&action=view",
                'download_url'  => "api/resources.php?id=$id&action=download",
            ];
        }, $rows);
    }

    /*
        Can the current user open this file?
        - Class resource: the class's faculty/dean, or any enrolled student.
        - Post attachment: anyone who can see the post (posts keep their section audience).
    */
    private function canOpen(array $file): bool {
        $classId = (int) $file['class_id'];
        if ($this->access->canManage($this->user, $classId)) {
            return true;
        }
        $enrollment = $this->access->enrollment($this->user, $classId);
        if (!$enrollment['enrolled']) {
            return false;
        }
        if ($file['context'] === 'resource') {
            return true;
        }
        $post = $file['post_id'] === null ? null : $this->posts->getById((int) $file['post_id']);
        return $post !== null
            && $this->posts->visibleToBlock((int) $post['id'], $enrollment['block_id']);
    }

    private function forbidden(): ApiResponse {
        return new ApiResponse(false, 403, "You don't have access to this class.", []);
    }

    // "3", 3, ["1","2"] -> [1, 2]; ignores blanks
    public static function ids(mixed $value): array {
        if ($value === null || $value === '') {
            return [];
        }
        $ids = [];
        foreach ((array) $value as $item) {
            // accepts blocks[]=1&blocks[]=2 as well as blocks=1,2
            foreach (explode(',', (string) $item) as $part) {
                $part = trim($part);
                if (ctype_digit($part) && (int) $part > 0) {
                    $ids[] = (int) $part;
                }
            }
        }
        return array_values(array_unique($ids));
    }
}
