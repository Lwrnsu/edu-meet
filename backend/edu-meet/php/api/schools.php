<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../controllers/SchoolController.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

AuthMiddleware::requireAuth();

$id = null;
if (isset($_GET['id']) && $_GET['id'] !== '') {
    if (!ctype_digit((string) $_GET['id'])) {
        Response::error('School id must be a positive integer', 400);
    }
    $id = (int) $_GET['id'];
}

$controller = new SchoolController();
$controller->handle($_SERVER['REQUEST_METHOD'] ?? 'GET', $id);
