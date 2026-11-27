<?php

require_once __DIR__ . '/../helpers/Cors.php';

Cors::apply(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

require_once __DIR__ . '/../controllers/UserRoleController.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

AuthMiddleware::requireAuth();

$id = null;
if (isset($_GET['id']) && $_GET['id'] !== '') {
    if (!ctype_digit((string) $_GET['id'])) {
        Response::error('User role id must be a positive integer', 400);
    }
    $id = (int) $_GET['id'];
}

$userId = null;
if (isset($_GET['user_id']) && $_GET['user_id'] !== '') {
    if (!ctype_digit((string) $_GET['user_id'])) {
        Response::error('User id must be a positive integer', 400);
    }
    $userId = (int) $_GET['user_id'];
}

$controller = new UserRoleController();
$controller->handle($_SERVER['REQUEST_METHOD'] ?? 'GET', $id, $userId);
