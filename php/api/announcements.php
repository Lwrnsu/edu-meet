<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../controllers/AnnouncementController.php';

$controller = new AnnouncementController();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

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

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0){
    $id = isset($input['announcement_id']) 
    ? (int) $input['announcement_id']
    : (isset($input['id']) 
        ? (int) $input['id'] 
        : 0);
}

$response = match ($method) {
    'GET' => $id > 0 ? $controller->show($id) : $controller->index($_GET),
    'POST' => $controller->store($input),
    'PUT', 'PATCH' => $controller->update($id, $input),
    'DELETE' => $controller->destroy($id),
    default => new ApiResponse(false, 405, "Method not allowed.", []),
};

http_response_code($response->code);
echo json_encode($response, JSON_PRETTY_PRINT);