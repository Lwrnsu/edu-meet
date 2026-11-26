<?php
/** File storage for uploads. Files are saved under random names in /php/uploads. */
final class Uploader
{
    /** @return array<int, array{0:string,1:string,2:int}> [original name, stored name, size] */
    public static function many(string $key): array
    {
        $out = [];
        if (empty($_FILES[$key]['name'])) return $out;

        $f = $_FILES[$key];
        $multi = is_array($f['name']);
        $n = $multi ? count($f['name']) : 1;

        for ($i = 0; $i < $n; $i++) {
            $name = basename($multi ? $f['name'][$i] : $f['name']);
            $tmp  = $multi ? $f['tmp_name'][$i] : $f['tmp_name'];
            $err  = $multi ? $f['error'][$i]    : $f['error'];
            $size = $multi ? $f['size'][$i]     : $f['size'];
            $ext  = Util::ext($name);

            if ($err !== UPLOAD_ERR_OK || $size > MAX_BYTES || !in_array($ext, ALLOWED, true)) continue;

            $mimes = ['pdf' => ['application/pdf'], 'png' => ['image/png'],
                      'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg']];
            if (isset($mimes[$ext]) && function_exists('finfo_open')) {
                $fi = finfo_open(FILEINFO_MIME_TYPE);
                if (!in_array(finfo_file($fi, $tmp), $mimes[$ext], true)) continue;
            }

            $stored = bin2hex(random_bytes(8)) . '.' . $ext;
            if (move_uploaded_file($tmp, UPLOAD_DIR . $stored)) $out[] = [$name, $stored, (int) $size];
        }
        return $out;
    }

    public static function one(string $key): ?array
    {
        $all = self::many($key);
        return $all[0] ?? null;
    }

    public static function remove(string $storedName): void
    {
        $f = UPLOAD_DIR . basename($storedName);
        if (is_file($f)) unlink($f);
    }
}
