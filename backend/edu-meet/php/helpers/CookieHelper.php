<?php

class CookieHelper
{
    public static function set(string $name, string $value, int $ttlSeconds): void
    {
        $config = require __DIR__ . '/../config/cookies.php';

        setcookie($name, $value, [
            'expires' => time() + $ttlSeconds,
            'path' => '/',
            'secure' => (bool) $config['secure'],
            'httponly' => true,
            'samesite' => $config['same_site'],
        ]);
    }

    public static function clear(string $name): void
    {
        $config = require __DIR__ . '/../config/cookies.php';

        setcookie($name, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => (bool) $config['secure'],
            'httponly' => true,
            'samesite' => $config['same_site'],
        ]);
    }

    public static function get(string $name): ?string
    {
        $value = $_COOKIE[$name] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }
}
