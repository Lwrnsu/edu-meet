<?php
/*
    FILE MANAGEMENT API  —  /api/resources.php

    GET    ?class_id=1[&search=lesson][&type=pdf|doc|slide|sheet|image|zip]   list resources (F1/F2)
    GET    ?id=5                                                              file details (F6)
    GET    ?id=5&action=view                                                  open in browser (F6)
    GET    ?id=5&action=download                                              download (F1/F6)
    POST   multipart: class_id, files[]                                       upload (F3)
    POST   ?id=5&action=update   body: name                                   rename (F4)
    DELETE ?id=5                                                              delete (F5)
    GET    ?action=blocks&class_id=1     the class's sections, used by the Create Post audience picker

    Resources are shared with everyone enrolled in the class (no per-section audience).

    Responses are ApiResponse JSON: { response, code, message, body }.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../helpers/Http.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../controllers/ResourceController.php";

$user = CurrentUser::fromRequest();
if ($user === null) {
    Http::json(new ApiResponse(false, 401, "Please log in first.", []));
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : null;

try {
    $controller = new ResourceController(Database::connect(), $user, new FileStorage());

    if ($method === 'GET' && $action === 'blocks' && $classId) {
        Http::json($controller->blocks($classId));
    }
    if ($method === 'GET' && $id && ($action === 'view' || $action === 'download')) {
        $result = $controller->openFile($id, $action === 'view');
        if ($result instanceof ApiResponse) {
            Http::json($result);
        }
        Http::sendFile($result['path'], $result['name'], $result['mime'], $result['inline']);
    }
    if ($method === 'GET' && $id) {
        Http::json($controller->show($id));
    }
    if ($method === 'GET' && $classId) {
        $type = isset($_GET['type']) && $_GET['type'] !== '' ? (string) $_GET['type'] : null;
        Http::json($controller->list($classId, $_GET['search'] ?? null, $type));
    }
    if ($method === 'POST' && $id && $action === 'update') {
        $input = Http::input();
        Http::json($controller->update($id, array_key_exists('name', $input) ? (string) $input['name'] : null));
    }
    if ($method === 'POST' && !$id) {
        $input = Http::input();
        if (empty($input['class_id'])) {
            Http::json(new ApiResponse(false, 400, "class_id is required.", []));
        }
        Http::json($controller->upload((int) $input['class_id'], FileStorage::normalize($_FILES['files'] ?? null)));
    }
    if ($method === 'DELETE' && $id) {
        Http::json($controller->delete($id));
    }
    Http::json(new ApiResponse(false, 400, "Unknown request.", []));
} catch (Throwable $e) {
    error_log("[resources] " . $e);
    Http::json(new ApiResponse(false, 500, "Something went wrong. Please try again.", []));
}
