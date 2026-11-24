<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../controllers/ScopeController.php';

$controller = new ScopeController();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$response = match ($method) {
    'GET' => $controller->index($_GET),
    default => new ApiResponse(false, 405, 'Method not allowed.', []),
};

http_response_code($response->code);
echo json_encode($response, JSON_PRETTY_PRINT);