<?php

require_once __DIR__ . '/../helpers/JwtHelper.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/CookieHelper.php';
require_once __DIR__ . '/../helpers/SessionStore.php';

class AuthMiddleware
{
    public static function requireAuth(): array
    {
        $cookies = require __DIR__ . '/../config/cookies.php';
        $token = CookieHelper::get($cookies['access_name']) ?? self::getBearerToken();

        if ($token === null) {
            Response::error('Missing authentication token', 401);
        }

        $config = require __DIR__ . '/../config/jwt.php';

        try {
            $payload = JwtHelper::decode($token, $config['secret']);
        } catch (Throwable $e) {
            Response::error('Invalid or expired token', 401);
        }

        if (!isset($payload['sub'])) {
            Response::error('Invalid token payload', 401);
        }

        self::requireActiveSession($token);

        return $payload;
    }

    private static function requireActiveSession(string $token): void
    {
        try {
            $active = (new SessionStore())->accessExists($token);
        } catch (ApiException $e) {
            Response::error($e->getMessage(), $e->getCode() ?: 503);
            return;
        }

        if (!$active) {
            Response::error('Session has ended, please log in again', 401);
        }
    }

    private static function getBearerToken(): ?string
    {
        $header = self::getAuthorizationHeader();
        if ($header !== null && preg_match('/^Bearer\s+(\S+)$/i', $header, $matches)) {
            return $matches[1];
        }

        return null;
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
