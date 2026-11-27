<?php
/*
    SCHOOL ANNOUNCEMENTS API  —  /api/announcements.php   (dashboard, not per class)

    GET    [?page=2][&status=draft|published|archived][&mine=1]   feed, pinned first, 10 per page
    GET    ?id=5                                                  one announcement
    GET    ?id=5&action=view | download                           its attachment (the file)
    GET    ?action=targets                                        Target Audience choices for me
    POST   multipart or JSON: title, body, targets[], is_pinned,
                      status (published | draft), file (optional) create
    POST   ?id=5&action=update   same fields (only the ones sent change),
                      remove_attachment=1                         edit / pin / publish / archive
    DELETE ?id=5                                                  delete

    targets[] are tokens: ALL_STUDENTS, YR:2, DEPT:3, DEPT_YR:3:2,
    PROG:8, PROG_YR:8:2, SEC:1  (see services/AnnouncementScope.php).

    The poster is the logged-in user (session). user_id / role sent in the
    request are ignored.

    Responses are ApiResponse JSON: { response, code, message, body }.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../helpers/Http.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../controllers/AnnouncementController.php";

$user = CurrentUser::fromRequest();
if ($user === null) {
    Http::json(new ApiResponse(false, 401, "Please log in first.", []));
}
session_write_close();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

// "targets" may come as targets[]=… (form), a JSON array, or "SEC:1,SEC:2".
function announcementTargets(mixed $value): array {
    if (is_array($value)) {
        return $value;
    }
    $value = trim((string) $value);
    $decoded = json_decode($value, true);
    if (is_array($decoded)) {
        return $decoded;
    }
    return $value === '' ? [] : array_map('trim', explode(',', $value));
}
function announcementFlag(mixed $value): bool {
    return filter_var($value, FILTER_VALIDATE_BOOLEAN);
}
function announcementFiles(): array {
    return FileStorage::normalize($_FILES['file'] ?? $_FILES['files'] ?? null);
}

try {
    $controller = new AnnouncementController(Database::connect(), $user, new FileStorage());

    if ($method === 'GET' && $id && ($action === 'view' || $action === 'download')) {
        $result = $controller->attachment($id, $action === 'view');
        if ($result instanceof ApiResponse) {
            Http::json($result);
        }
        Http::sendFile($result['path'], $result['name'], $result['mime'], $action === 'view');
    }
    if ($method === 'GET' && $action === 'targets') {
        Http::json($controller->targets());
    }
    if ($method === 'GET' && $id) {
        Http::json($controller->show($id));
    }
    if ($method === 'GET') {
        $status = isset($_GET['status']) && $_GET['status'] !== '' ? (string) $_GET['status'] : null;
        Http::json($controller->feed((int) ($_GET['page'] ?? 1), $status, announcementFlag($_GET['mine'] ?? false)));
    }
    if ($method === 'POST' && $id && $action === 'update') {
        $input = Http::input();
        $fields = [];
        foreach (['title', 'body', 'status'] as $f) {
            if (array_key_exists($f, $input)) {
                $fields[$f] = (string) $input[$f];
            }
        }
        if (array_key_exists('is_pinned', $input)) {
            $fields['is_pinned'] = announcementFlag($input['is_pinned']);
        }
        if (array_key_exists('targets', $input)) {
            $fields['targets'] = announcementTargets($input['targets']);
        }
        Http::json($controller->update($id, $fields, announcementFiles(), announcementFlag($input['remove_attachment'] ?? false)));
    }
    if ($method === 'POST' && !$id) {
        $input = Http::input();
        Http::json($controller->create(
            (string) ($input['title'] ?? ''),
            (string) ($input['body'] ?? $input['content'] ?? ''),
            announcementTargets($input['targets'] ?? []),
            announcementFlag($input['is_pinned'] ?? false),
            (string) ($input['status'] ?? 'published'),
            announcementFiles()
        ));
    }
    if ($method === 'DELETE' && $id) {
        Http::json($controller->delete($id));
    }
    Http::json(new ApiResponse(false, 400, "Unknown request.", []));
} catch (Throwable $e) {
    error_log("[announcements] " . $e);
    Http::json(new ApiResponse(false, 500, "Something went wrong. Please try again.", []));
}
