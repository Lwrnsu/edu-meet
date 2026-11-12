<?php

require_once __DIR__ . '/../helpers/JwtHelper.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class AuthMiddleware
{
    public static function requireAuth(): array
    {
        $header = self::getAuthorizationHeader();
        if ($header === null || !preg_match('/^Bearer\s+(\S+)$/i', $header, $matches)) {
            Response::error('Missing or invalid Authorization header', 401);
        }

        $config = require __DIR__ . '/../config/jwt.php';

        try {
            $payload = JwtHelper::decode($matches[1], $config['secret']);
        } catch (Throwable $e) {
            Response::error('Invalid or expired token', 401);
        }

        if (!isset($payload['sub'])) {
            Response::error('Invalid token payload', 401);
        }

        return $payload;
    }

    private static function getAuthorizationHeader(): ?string
    {
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            return trim((string) $_SERVER['HTTP_AUTHORIZATION']);
        }

        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return trim((string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
        }

        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $key => $value) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    return trim((string) $value);
                }
            }
        }

        return null;
    }
}
