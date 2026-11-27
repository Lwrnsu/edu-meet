<?php

class CookieHelper
{
    public static function set(string $name, string $value, int $ttlSeconds): void
    {
        setcookie($name, $value, self::options(time() + $ttlSeconds));
    }

    public static function clear(string $name): void
    {
        setcookie($name, '', self::options(time() - 3600));
    }

    public static function get(string $name): ?string
    {
        $value = $_COOKIE[$name] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    private static function options(int $expires): array
    {
        $config = require __DIR__ . '/../config/cookies.php';

        return [
            'expires' => $expires,
            'path' => '/',
            'secure' => self::isSecure($config['secure']),
            'httponly' => true,
            'samesite' => $config['same_site'],
        ];
    }

    private static function isSecure($setting): bool
    {
        if (is_bool($setting)) {
            return $setting;
        }

        $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
        $forwarded = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));

        return ($https !== '' && $https !== 'off') || $forwarded === 'https';
    }
}
