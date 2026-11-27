<?php
/*
    Small helpers for the api/ entry files: reading input and sending
    JSON or files back.
*/
require_once __DIR__ . "/../models/ApiResponse.php";

class Http {
    public static function json(ApiResponse $response): never {
        http_response_code($response->code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Form fields (multipart / urlencoded) or a JSON body.
    public static function input(): array {
        if (!empty($_POST)) {
            return $_POST;
        }
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /*
        Streams a stored file.
        $inline = true  -> opens in the browser (View File page)
        $inline = false -> saves as a download
    */
    public static function sendFile(string $path, string $fileName, string $mimeType, bool $inline): never {
        if (!is_file($path)) {
            self::json(new ApiResponse(false, 404, "The file is missing from storage.", []));
        }
        $safeName = str_replace(['"', "\r", "\n"], '', $fileName);
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($path));
        header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment')
            . '; filename="' . $safeName . '"; filename*=UTF-8\'\'' . rawurlencode($fileName));
        readfile($path);
        exit;
    }
}
