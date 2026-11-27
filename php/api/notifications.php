<?php
/*
    NOTIFICATIONS API  —  /api/notifications.php

    GET                          newest 20 + unread count (N1/N2/N3)
    POST ?id=7&action=read       mark one as read
    POST ?action=read_all        mark all as read

    Responses are ApiResponse JSON: { response, code, message, body }.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../helpers/Http.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/../controllers/NotificationController.php";

$user = CurrentUser::fromRequest();
if ($user === null) {
    Http::json(new ApiResponse(false, 401, "Please log in first.", []));
}
// The page checks every 30 seconds; release the session lock right away.
session_write_close();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

try {
    $controller = new NotificationController(Database::connect(), $user);
    if ($method === 'GET') {
        Http::json($controller->list((int) ($_GET['limit'] ?? 20)));
    }
    if ($method === 'POST' && $action === 'read_all') {
        Http::json($controller->readAll());
    }
    if ($method === 'POST' && $action === 'read' && $id) {
        Http::json($controller->read($id));
    }
    Http::json(new ApiResponse(false, 400, "Unknown request.", []));
} catch (Throwable $e) {
    error_log("[notifications] " . $e);
    Http::json(new ApiResponse(false, 500, "Something went wrong. Please try again.", []));
}
