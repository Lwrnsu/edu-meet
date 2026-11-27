<?php

require_once __DIR__ . '/ApiResponse.php';

trait ApiRouteHelper
{
    private function dispatch(array $routes): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $path   = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
        if ($path === '') {
            $path = '/';
        }

        $key = "$method $path";
        if (isset($routes[$key])) {
            $this->{$routes[$key]}();
            return;
        }

        foreach (array_keys($routes) as $route) {
            $routePath = substr($route, strpos($route, ' ') + 1);
            if ($routePath === $path) {
                $this->respond(new ApiResponse(false, 405, 'Method not allowed', []));
                return;
            }
        }

        $this->respond(new ApiResponse(false, 404, 'Endpoint not found', []));
    }

    private function respond(ApiResponse $res): void
    {
        http_response_code($res->code);
        echo json_encode($res);
    }

    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}