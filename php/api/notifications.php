<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../controllers/NotificationController.php';

$controller = new NotificationController();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$rawBody = file_get_contents('php://input');
$jsonBody = [];
if ($rawBody !== false && trim($rawBody) !== '') {
    $decoded = json_decode($rawBody, true);
    if (!is_array($decoded)) {
        $response = new ApiResponse(false, 400, "Invalid JSON request body.", []);
        http_response_code($response->code);
        echo json_encode($response);
        exit;
    }
    $jsonBody = $decoded;
}

$input = !empty($jsonBody) ? $jsonBody : $_POST;

$response = match ($method) {
    'GET' => $controller->index($_GET),
    'POST', 'PUT', 'PATCH' => $controller->markRead($input),
    default => new ApiResponse(false, 405, "Method not allowed.", []),
};

http_response_code($response->code);
echo json_encode($response, JSON_PRETTY_PRINT);