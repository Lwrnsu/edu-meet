<?php
/*
    BLOGS & ANNOUNCEMENTS API  —  /api/posts.php

    GET    ?class_id=1[&page=2][&type=announcement|blog][&section=821]   class feed, 10 per page (B1/B2)
    GET    ?id=3                                                   one post (B1/B2)
    POST   multipart: class_id, title, type, message,
                      blocks[] (optional), files[] (optional)      create post (B3)
    POST   ?id=3&action=update   multipart: title, type, message,
                      blocks[], files[] (add), remove_files[]      edit post (B4)
    DELETE ?id=3                                                   delete post (B5)

    Posts are visible to students as soon as they are created.

    Responses are ApiResponse JSON: { response, code, message, body }.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../helpers/Http.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../controllers/PostController.php";

$user = CurrentUser::fromRequest();
if ($user === null) {
    Http::json(new ApiResponse(false, 401, "Please log in first.", []));
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : null;

try {
    $controller = new PostController(Database::connect(), $user, new FileStorage());

    if ($method === 'GET' && $id) {
        Http::json($controller->show($id));
    }
    if ($method === 'GET' && $classId) {
        $type = isset($_GET['type']) && $_GET['type'] !== '' ? (string) $_GET['type'] : null;
        Http::json($controller->feed($classId, (int) ($_GET['page'] ?? 1), $type, isset($_GET['section']) && $_GET['section'] !== '' ? (int) $_GET['section'] : null));
    }
    if ($method === 'POST' && $id && $action === 'update') {
        $input = Http::input();
        Http::json($controller->update(
            $id,
            isset($input['title']) ? (string) $input['title'] : null,
            isset($input['type']) ? (string) $input['type'] : null,
            isset($input['message']) ? (string) $input['message'] : null,
            array_key_exists('blocks', $input) ? (array) $input['blocks'] : null,
            FileStorage::normalize($_FILES['files'] ?? null),
            (array) ($input['remove_files'] ?? [])
        ));
    }
    if ($method === 'POST' && !$id) {
        $input = Http::input();
        if (empty($input['class_id'])) {
            Http::json(new ApiResponse(false, 400, "class_id is required.", []));
        }
        Http::json($controller->create(
            (int) $input['class_id'],
            (string) ($input['title'] ?? ''),
            (string) ($input['type'] ?? ''),
            (string) ($input['message'] ?? ''),
            (array) ($input['blocks'] ?? []),
            FileStorage::normalize($_FILES['files'] ?? null)
        ));
    }
    if ($method === 'DELETE' && $id) {
        Http::json($controller->delete($id));
    }
    Http::json(new ApiResponse(false, 400, "Unknown request.", []));
} catch (Throwable $e) {
    error_log("[posts] " . $e);
    Http::json(new ApiResponse(false, 500, "Something went wrong. Please try again.", []));
}
