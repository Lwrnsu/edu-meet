<?php
/*
    TASKS API  —  /api/tasks.php

    GET    ?class_id=1[&search=photo]                    Tasks tab list
    GET    ?id=5                                         task details (Activities tab)
    POST   multipart: class_id, title, instructions, max_score, deadline[, file]     add task
    POST   ?id=5&action=update   multipart: any of title, instructions, max_score,
                                 deadline, is_closed[, file][, remove_attachment=1]  edit task
    DELETE ?id=5                                         delete task (and its files)
    POST   ?id=5&action=submit   multipart: file         student hands in / replaces work
    POST   ?id=5&action=unsubmit                         student removes their work
    POST   ?action=grade&submission_id=9   body: score, feedback                     faculty grades
    GET    ?id=5&action=file&kind=attachment[&view=1]    the task's attachment
    GET    ?id=9&action=file&kind=submission[&view=1]    a handed-in file

    Responses are ApiResponse JSON: { response, code, message, body }.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../helpers/Http.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/../services/FileStorage.php";
require_once __DIR__ . "/../controllers/TaskController.php";

try {
    $pdo = Database::connect();
    $user = CurrentUser::fromRequest($pdo);
    if ($user === null) {
        Http::json(new ApiResponse(false, 401, "Please log in first.", []));
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : null;
    $controller = new TaskController($pdo, $user, new FileStorage());
    $files = fn() => FileStorage::normalize($_FILES['file'] ?? null);

    if ($method === 'GET' && $id && $action === 'file') {
        $result = $controller->file($id, ($_GET['kind'] ?? '') === 'submission' ? 'submission' : 'attachment', !empty($_GET['view']));
        if ($result instanceof ApiResponse) {
            Http::json($result);
        }
        Http::sendFile($result['path'], $result['name'], $result['mime'], !empty($_GET['view']));
    }
    if ($method === 'GET' && $id) {
        Http::json($controller->show($id));
    }
    if ($method === 'GET' && $classId) {
        Http::json($controller->list($classId, $_GET['search'] ?? null));
    }
    if ($method === 'POST' && $action === 'grade') {
        $input = Http::input();
        $feedback = array_key_exists('feedback', $input) ? (string) $input['feedback'] : null;
        Http::json($controller->grade((int) ($_GET['submission_id'] ?? $input['submission_id'] ?? 0), $input['score'] ?? null, $feedback));
    }
    if ($method === 'POST' && $id && $action === 'submit') {
        Http::json($controller->submit($id, $files()));
    }
    if ($method === 'POST' && $id && $action === 'unsubmit') {
        Http::json($controller->unsubmit($id));
    }
    if ($method === 'POST' && $id && $action === 'update') {
        $input = Http::input();
        Http::json($controller->update($id, $input, $files(), !empty($input['remove_attachment'])));
    }
    if ($method === 'POST' && !$id) {
        $input = Http::input();
        if (empty($input['class_id'])) {
            Http::json(new ApiResponse(false, 400, "class_id is required.", []));
        }
        Http::json($controller->create((int) $input['class_id'], $input, $files()));
    }
    if ($method === 'DELETE' && $id) {
        Http::json($controller->delete($id));
    }
    Http::json(new ApiResponse(false, 400, "Unknown request.", []));
} catch (Throwable $e) {
    error_log("[tasks] " . $e);
    Http::json(new ApiResponse(false, 500, "Something went wrong. Please try again.", []));
}
