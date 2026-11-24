<?php
// Shared helpers for the JSON controllers: CORS, request checks, input parsing,
// sending ApiResponse objects and dispatching ?action=... to controller methods.

require_once __DIR__ . '/../models/ApiResponse.php';

class HttpError extends RuntimeException {}

class Api {
    // Front-end origins allowed to call the PHP API with cookies (Vite dev server).
    const FRONTEND_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

    public static function boot(): void {
        ini_set('display_errors', '0'); // PHP notices would corrupt the JSON; they still go to the error log.
        if (session_status() !== PHP_SESSION_ACTIVE) session_start();

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, self::FRONTEND_ORIGINS, true)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-User-Id');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Expose-Headers: Content-Disposition');
            header('Vary: Origin');
        }
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // A custom header can't be sent by a plain cross-site form, so this blocks CSRF.
            if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
                self::fail(403, 'Missing X-Requested-With: XMLHttpRequest header.');
            }
            if (!$_POST && !$_FILES && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0
                && !str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
                self::fail(413, 'Upload too large. The maximum file size is 30 MB.');
            }
        }
    }

    public static function send(ApiResponse $r): never {
        http_response_code($r->code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok(string $message, array $body = [], int $code = 200): never {
        self::send(new ApiResponse(true, $code, $message, $body));
    }

    public static function fail(int $code, string $message): never {
        self::send(new ApiResponse(false, $code, $message, []));
    }

    // Form fields (multipart/x-www-form-urlencoded) or a JSON body, plus query string.
    public static function input(): array {
        static $data = null;
        if ($data === null) {
            $json = [];
            if (str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
                $json = json_decode(file_get_contents('php://input'), true) ?: [];
            }
            $data = array_merge($_GET, $_POST, $json);
        }
        return $data;
    }

    public static function int(string $key): int {
        return (int)(self::input()[$key] ?? 0);
    }

    public static function str(string $key): string {
        return trim((string)(self::input()[$key] ?? ''));
    }

    // $routes: ['action' => ['GET' | 'POST', 'methodName'], ...]
    public static function run(string $controllerClass, array $routes): never {
        self::boot();
        try {
            $action = $_GET['action'] ?? '';
            if (!isset($routes[$action])) {
                self::fail(404, 'Unknown action. Use one of: ' . implode(', ', array_keys($routes)) . '.');
            }
            [$method, $fn] = $routes[$action];
            if ($_SERVER['REQUEST_METHOD'] !== $method) self::fail(405, "Use $method for action '$action'.");
            (new $controllerClass())->$fn();
            self::fail(500, 'Controller did not send a response.');
        } catch (HttpError $e) {
            self::fail($e->getCode() ?: 400, $e->getMessage());
        } catch (InvalidArgumentException $e) {
            self::fail(422, $e->getMessage());
        } catch (Throwable $e) {
            error_log($e);
            self::fail(500, 'Server error.');
        }
    }
}
