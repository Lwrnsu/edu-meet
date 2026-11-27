<?php

header('Content-Type: application/json');

class FacultyClassController
{
    // "METHOD /path" => function name
    private array $routes = [
        'GET /api/get/classes' => 'getClasses',
        'GET /api/get/class' => 'getClass',
    ];

    public function handle()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $path   = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
        $key    = "$method $path";

        if (isset($this->routes[$key])) {
            $this->{$this->routes[$key]}();
            return;
        }

        // Same path but wrong HTTP method -> 405, otherwise 404
        foreach (array_keys($this->routes) as $k) {
            if (substr($k, strpos($k, ' ') + 1) === $path) {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
// same thing as studentcontroller
    private function getClasses()
    {
        
    }

    private function getClass()
    {

    }
}

(new FacultyClassController())->handle();