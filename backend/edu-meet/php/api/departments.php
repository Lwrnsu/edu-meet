<?php

require_once __DIR__ . '/../helpers/Cors.php';

Cors::apply(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

require_once __DIR__ . '/../controllers/DepartmentController.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

AuthMiddleware::requireAuth();

$id = null;
if (isset($_GET['id']) && $_GET['id'] !== '') {
    if (!ctype_digit((string) $_GET['id'])) {
        Response::error('Department id must be a positive integer', 400);
    }
    $id = (int) $_GET['id'];
}

$schoolId = null;
if (isset($_GET['school_id']) && $_GET['school_id'] !== '') {
    if (!ctype_digit((string) $_GET['school_id'])) {
        Response::error('School id must be a positive integer', 400);
    }
    $schoolId = (int) $_GET['school_id'];
}

$controller = new DepartmentController();
$controller->handle($_SERVER['REQUEST_METHOD'] ?? 'GET', $id, $schoolId);
