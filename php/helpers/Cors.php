<?php

class Cors
{
    public static function apply(array $methods = ['POST', 'OPTIONS']): void
    {
        $config = require __DIR__ . '/../config/cookies.php';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        header('Vary: Origin');
        if ($origin !== '' && in_array($origin, $config['allowed_origins'], true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
        }
        header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
