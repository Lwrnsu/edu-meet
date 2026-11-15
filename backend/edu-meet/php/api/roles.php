<?php

require_once __DIR__ . '/../helpers/Cors.php';

Cors::apply(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

require_once __DIR__ . '/../controllers/RoleController.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

AuthMiddleware::requireAuth();

$id = null;
if (isset($_GET['id']) && $_GET['id'] !== '') {
    if (!ctype_digit((string) $_GET['id'])) {
        Response::error('Role id must be a positive integer', 400);
    }
    $id = (int) $_GET['id'];
}

$controller = new RoleController();
$controller->handle($_SERVER['REQUEST_METHOD'] ?? 'GET', $id);
