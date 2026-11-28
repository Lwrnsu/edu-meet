<?php

require_once __DIR__ . '/JwtHelper.php';
require_once __DIR__ . '/CookieHelper.php';
require_once __DIR__ . '/AuthRoles.php';

/**
 * Resolves the caller identity from PHP cookies / Bearer (Spring Redis, then JWT).
 *
 * @return array{user_id:int, app_role:?string, portal_role:?string, claims:array}|null
 */
class AuthIdentity
{
    private const SPRING_CACHED_LOGIN_URL = 'http://127.0.0.1:8080/api/auth/logIn/cached';
    private const ACCESS_COOKIE_ALIAS = 'edu_meet_access';

    public static function resolveAccessToken(): ?string
    {
        $cookies = require __DIR__ . '/../config/cookies.php';
        $token = CookieHelper::get($cookies['access_name']);
        if ($token !== null) {
            return self::stripBearer($token);
        }

        $alias = CookieHelper::get(self::ACCESS_COOKIE_ALIAS);
        if ($alias !== null) {
            return self::stripBearer($alias);
        }

        return self::getBearerToken();
    }

    public static function resolve(): ?array
    {
        $token = self::resolveAccessToken();
        if ($token === null) {
            return null;
        }

        $claims = self::verifyWithSpringBoot($token);
        if ($claims === null) {
            $claims = self::verifyJwt($token);
        }

        if ($claims === null) {
            return null;
        }

        $userId = (int) ($claims['sub'] ?? 0);
        if ($userId <= 0) {
            return null;
        }

        $rawRole = isset($claims['role']) ? (string) $claims['role'] : null;
        $appRole = AuthRoles::toAppRole($rawRole);
        $portalRole = null;

        if ($rawRole !== null && $rawRole !== '') {
            $portal = AuthRoles::portalFromNormalized(AuthRoles::normalize($rawRole));
            if ($portal !== null) {
                $portalRole = $portal['key'];
            } elseif ($appRole === 'system_admin') {
                $portalRole = 'system_admin';
            } elseif ($appRole === 'dean') {
                $portalRole = 'college_dean';
            } elseif ($appRole !== null) {
                $portalRole = $appRole;
            }
        }

        if ($appRole === null) {
            $resolved = self::resolveRoleFromDatabase($userId);
            if ($resolved !== null) {
                $appRole = AuthRoles::toAppRole($resolved['role']);
                $portalRole = $resolved['role'];
                $claims['role'] = $appRole;
            }
        }

        return [
            'user_id' => $userId,
            'app_role' => $appRole,
            'portal_role' => $portalRole,
            'claims' => $claims,
        ];
    }

    /**
     * @return array{sub:int, role:?string, email?:string}|null
     */
    private static function verifyJwt(string $token): ?array
    {
        $config = require __DIR__ . '/../config/jwt.php';

        try {
            $payload = JwtHelper::decode($token, $config['secret']);
        } catch (Throwable $e) {
            return null;
        }

        if (!isset($payload['sub'])) {
            return null;
        }

        return $payload;
    }

    /**
     * @return array{sub:int, role:?string}|null
     */
    private static function verifyWithSpringBoot(string $token): ?array
    {
        $raw = self::fetchCachedLogin($token);
        if ($raw === null) {
            return null;
        }

        $decoded = json_decode($raw, true);
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
            'role' => isset($data['role']) ? (string) $data['role'] : null,
        ];
    }

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

    /**
     * @return array{role:string, role_label:string, school:?array}|null
     */
    private static function resolveRoleFromDatabase(int $userId): ?array
    {
        require_once __DIR__ . '/../services/AuthService.php';

        return (new AuthService())->resolveContextForUser($userId);
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

    private static function stripBearer(string $value): string
    {
        if (preg_match('/^Bearer\s+(\S+)$/i', trim($value), $matches) === 1) {
            return $matches[1];
        }

        return trim($value);
    }
}
