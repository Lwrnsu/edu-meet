<?php

declare(strict_types=1);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/../models/ApiResponse.php";

final class AttachmentUploadController
{
    private const MAX_BYTES = 10485760; // 10 MB

    private const ALLOWED_EXTENSIONS = [
        "png", "jpg", "jpeg", "gif", "webp",
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip"
    ];

    private function respond(bool $ok, int $code, string $message, array $body = []): void
    {
        http_response_code($code);
        echo json_encode(new ApiResponse($ok, $code, $message, $body));
    }

    public function handle(): void
    {
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            $this->respond(false, 405, "Method not allowed. Use POST.");
            return;
        }

        if (!isset($_FILES["file"]) || !is_array($_FILES["file"])) {
            $this->respond(false, 400, "No file uploaded under field 'file'.");
            return;
        }

        $file = $_FILES["file"];
        if (($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->respond(false, 400, "Upload failed with error code " . (int) ($file["error"] ?? -1) . ".");
            return;
        }

        $size = (int) ($file["size"] ?? 0);
        if ($size <= 0 || $size > self::MAX_BYTES) {
            $this->respond(false, 400, "File must be between 1 byte and 10 MB.");
            return;
        }

        $originalName = basename((string) ($file["name"] ?? "attachment"));
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            $this->respond(false, 400, "File type '.$extension' is not allowed.");
            return;
        }

        $baseDir = realpath(__DIR__ . "/..");
        if ($baseDir === false) {
            $this->respond(false, 500, "Failed to resolve PHP root directory.");
            return;
        }

        $uploadDir = $baseDir . DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . "announcements";
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            $this->respond(false, 500, "Failed to create upload directory.");
            return;
        }

        $safeBase = preg_replace("/[^A-Za-z0-9_-]+/", "_", pathinfo($originalName, PATHINFO_FILENAME));
        $safeBase = trim((string) $safeBase, "_") ?: "file";
        $storedName = $safeBase . "_" . bin2hex(random_bytes(6)) . "." . $extension;
        $destination = $uploadDir . DIRECTORY_SEPARATOR . $storedName;

        if (!move_uploaded_file((string) $file["tmp_name"], $destination)) {
            $this->respond(false, 500, "Could not save uploaded file.");
            return;
        }

        $this->respond(
            true,
            201,
            "File uploaded successfully.",
            [
                "attachment_name" => $originalName,
                "attachment_url" => "/uploads/announcements/" . $storedName,
                "size_bytes" => $size,
            ]
        );
    }
}

(new AttachmentUploadController())->handle();