<?php

require_once __DIR__ . '/../helpers/JwtHelper.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/CookieHelper.php';

class AuthMiddleware
{
    private const SPRING_CACHED_LOGIN_URL = 'http://127.0.0.1:8080/api/auth/logIn/cached';

    public static function requireAuth(): array
    {
        $cookies = require __DIR__ . '/../config/cookies.php';
        $token = CookieHelper::get($cookies['access_name']) ?? self::getBearerToken();

        if ($token === null) {
            Response::error('Missing authentication token', 401);
        }

        // Primary check: validate opaque/Bearer token against Spring Boot's Redis session store
        $springClaims = self::verifyWithSpringBoot($token);
        if ($springClaims !== null) {
            return $springClaims;
        }

        // Fallback: if a PHP JWT cookie was passed directly, verify its signature & expiry
        $config = require __DIR__ . '/../config/jwt.php';

        try {
            $payload = JwtHelper::decode($token, $config['secret']);
        } catch (Throwable $e) {
            Response::error('Session expired or token is invalid', 401);
        }

        if (!isset($payload['sub'])) {
            Response::error('Invalid token payload', 401);
        }

        return $payload;
    }

    private static function verifyWithSpringBoot(string $token): ?array
    {
        if (!function_exists('curl_init')) {
            return null;
        }

        $ch = curl_init(self::SPRING_CACHED_LOGIN_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Accept: application/json',
            ],
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_TIMEOUT => 5,
        ]);

        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || empty($decoded['success'])) {
            return null;
        }

        $data = $decoded['data'] ?? [];
        $userId = $data['userId'] ?? $data['user_id'] ?? $data['id'] ?? null;

        if ($userId === null) {
            return null;
        }

        return [
            'sub' => (int) $userId,
            'role' => $data['role'] ?? null,
        ];
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
