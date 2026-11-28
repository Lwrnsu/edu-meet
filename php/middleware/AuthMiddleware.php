<?php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/AuthIdentity.php';
require_once __DIR__ . '/../helpers/AuthRoles.php';

class AuthMiddleware
{
    public static function requireAuth(): array
    {
        $token = AuthIdentity::resolveAccessToken();
        if ($token === null) {
            Response::error('Missing authentication token', 401);
        }

        $identity = AuthIdentity::resolve();
        if ($identity === null) {
            Response::error('Session expired or token is invalid', 401);
        }

        $claims = $identity['claims'];
        $claims['sub'] = $identity['user_id'];
        if ($identity['app_role'] !== null) {
            $claims['role'] = $identity['app_role'];
        }
        if ($identity['portal_role'] !== null) {
            $claims['portal_role'] = $identity['portal_role'];
        }

        return $claims;
    }

    /**
     * @param list<string> $roles App roles (e.g. system_admin, college_admin) and/or portal keys
     */
    public static function requireAnyRole(array $roles): array
    {
        $claims = self::requireAuth();
        $allowed = [];
        foreach ($roles as $role) {
            $app = AuthRoles::toAppRole((string) $role);
            if ($app !== null) {
                $allowed[$app] = true;
            }
        }

        $current = AuthRoles::toAppRole(isset($claims['role']) ? (string) $claims['role'] : null);
        if ($current === null || !isset($allowed[$current])) {
            Response::error('Forbidden', 403);
        }

        return $claims;
    }
}
