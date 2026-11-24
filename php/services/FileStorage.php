<?php
// Saves uploaded files to php/storage/uploads under random names, deletes them,
// and streams them back to the browser (download or inline view).

require_once __DIR__ . '/Api.php';

class FileStorage {
    const ALLOWED  = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'zip'];
    const VIEWABLE = ['pdf', 'png', 'jpg', 'jpeg', 'txt'];
    const MAX_BYTES = 30 * 1024 * 1024;

    const CHECK_MIME = ['pdf' => ['application/pdf'], 'png' => ['image/png'], 'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg']];
    const SEND_MIME  = ['pdf' => 'application/pdf', 'png' => 'image/png', 'jpg' => 'image/jpeg',
                        'jpeg' => 'image/jpeg', 'txt' => 'text/plain; charset=utf-8'];

    public static function dir(): string {
        return __DIR__ . '/../storage/uploads/';
    }

    public static function ext(string $name): string {
        return strtolower(pathinfo($name, PATHINFO_EXTENSION));
    }

    public static function viewable(string $name): bool {
        return in_array(self::ext($name), self::VIEWABLE, true);
    }

    // Returns a list of ['name' => original, 'path' => stored, 'size' => bytes] for every valid file.
    // Accepts both name="files[]" (multiple) and name="file" (single) inputs.
    public static function storeMany(string $key): array {
        $out = [];
        if (empty($_FILES[$key]['name'])) return $out;
        $f = $_FILES[$key];
        $multi = is_array($f['name']);
        $n = $multi ? count($f['name']) : 1;

        for ($i = 0; $i < $n; $i++) {
            $name = basename($multi ? $f['name'][$i] : $f['name']);
            $tmp  = $multi ? $f['tmp_name'][$i] : $f['tmp_name'];
            $err  = $multi ? $f['error'][$i] : $f['error'];
            $size = $multi ? $f['size'][$i] : $f['size'];
            $ext  = self::ext($name);

            if ($err !== UPLOAD_ERR_OK || $size > self::MAX_BYTES || !in_array($ext, self::ALLOWED, true)) continue;
            if (isset(self::CHECK_MIME[$ext]) && function_exists('finfo_open')) {
                $fi = finfo_open(FILEINFO_MIME_TYPE);
                if (!in_array(finfo_file($fi, $tmp), self::CHECK_MIME[$ext], true)) continue;
            }
            if (!is_dir(self::dir())) mkdir(self::dir(), 0775, true);
            $stored = bin2hex(random_bytes(8)) . '.' . $ext;
            if (move_uploaded_file($tmp, self::dir() . $stored)) {
                $out[] = ['name' => $name, 'path' => $stored, 'size' => (int)$size];
            }
        }
        return $out;
    }

    public static function store(string $key): ?array {
        return self::storeMany($key)[0] ?? null;
    }

    public static function remove(?string $path): void {
        if (!$path) return;
        $f = self::dir() . basename($path);
        if (is_file($f)) unlink($f);
    }

    // Sends the file and stops. $inline = open in the browser (only for VIEWABLE types).
    public static function send(string $path, string $downloadName, bool $inline = false): never {
        $full = self::dir() . basename($path);
        if (!is_file($full)) throw new HttpError('File not found.', 404);
        $ext = self::ext($downloadName);
        $inline = $inline && self::viewable($downloadName);

        header('Content-Type: ' . (self::SEND_MIME[$ext] ?? 'application/octet-stream'));
        header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . "; filename*=UTF-8''" . rawurlencode($downloadName));
        header('Content-Length: ' . filesize($full));
        header('X-Content-Type-Options: nosniff');
        readfile($full);
        exit;
    }

    public static function rules(): array {
        return ['allowed' => self::ALLOWED, 'viewable' => self::VIEWABLE, 'max_bytes' => self::MAX_BYTES];
    }
}
