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
        $raw = self::fetchCachedLogin($token);
        if ($raw === null) {
            return null;
        }

        $decoded = json_decode($raw, true);

        // Spring's ApiResponse is { status, message, body }
        if (!is_array($decoded)) {
            return null;
        }

        $ok = $decoded['status'] ?? $decoded['success'] ?? false;
        if (empty($ok)) {
            return null;
        }

        $data = $decoded['body'] ?? $decoded['data'] ?? [];
        if (!is_array($data)) {
            return null;
        }

        $userId = (int) ($data['id'] ?? $data['userId'] ?? $data['user_id'] ?? 0);

        if ($userId <= 0) {
            return null;
        }

        return [
            'sub' => $userId,
            'role' => $data['role'] ?? null,
        ];
    }

    /** Returns Spring's response body only when it answered HTTP 200, otherwise null. */
    private static function fetchCachedLogin(string $token): ?string
    {
        $headers = [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ];

        if (function_exists('curl_init')) {
            $ch = curl_init(self::SPRING_CACHED_LOGIN_URL);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 5,
            ]);

            $raw = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

            return ($httpCode === 200 && is_string($raw) && $raw !== '') ? $raw : null;
        }

        // No curl extension: use PHP streams instead
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ]);

        $raw = @file_get_contents(self::SPRING_CACHED_LOGIN_URL, false, $context);

        $responseHeaders = function_exists('http_get_last_response_headers')
            ? (http_get_last_response_headers() ?? [])
            : ($http_response_header ?? []);

        $httpCode = 0;
        if (isset($responseHeaders[0]) && preg_match('#HTTP/\S+\s+(\d{3})#', $responseHeaders[0], $m)) {
            $httpCode = (int) $m[1];
        }

        return ($httpCode === 200 && is_string($raw) && $raw !== '') ? $raw : null;
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
