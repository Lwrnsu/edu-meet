<?php
/** JSON responses + request input. */
final class Http
{
    public static function json($payload, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok($data = [], ?string $message = null): void
    {
        self::json(['ok' => true, 'message' => $message, 'data' => $data]);
    }

    public static function fail(string $error, int $code = 400, array $extra = []): void
    {
        self::json(array_merge(['ok' => false, 'error' => $error], $extra), $code);
    }
}

/** Reads query string, form fields, or a JSON body (in that merge order). */
final class Request
{
    private static $json = null;

    public static function isMultipart(): bool
    {
        return strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') === 0;
    }

    private static function jsonBody(): array
    {
        if (self::$json === null) {
            self::$json = [];
            if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === 0) {
                $d = json_decode(file_get_contents('php://input'), true);
                if (is_array($d)) self::$json = $d;
            }
        }
        return self::$json;
    }

    public static function all(): array
    {
        return array_merge($_GET, $_POST, self::jsonBody());
    }

    public static function get(string $key, $default = null)
    {
        $a = self::all();
        return array_key_exists($key, $a) ? $a[$key] : $default;
    }

    public static function int(string $key, int $default = 0): int
    {
        return (int) self::get($key, $default);
    }

    public static function str(string $key, string $default = ''): string
    {
        $v = self::get($key, $default);
        return is_scalar($v) ? trim((string) $v) : $default;
    }

    /** Checkbox-style flag: absent/""/"0"/"false"/"off" => false. */
    public static function flag(string $key): bool
    {
        $v = self::get($key, false);
        return !in_array($v, [false, null, '', 0, '0', 'false', 'off'], true);
    }
}
