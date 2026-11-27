<?php

class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, int $status = 400, mixed $details = null): void
    {
        $body = [
            'timestamp' => gmdate('c'),
            'status' => $status,
            'error' => self::statusText($status),
            'message' => $message,
        ];

        if ($details !== null) {
            $body['details'] = $details;
        }

        self::json($body, $status);
    }

    private static function statusText(int $status): string
    {
        return match ($status) {
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            405 => 'Method Not Allowed',
            409 => 'Conflict',
            422 => 'Unprocessable Entity',
            500 => 'Internal Server Error',
            default => 'Error',
        };
    }
}
