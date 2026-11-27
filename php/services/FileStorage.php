<?php
/*
    Saves, finds and deletes uploaded files on disk.

    - Allowed types and the 25 MB limit match the upload screens.
    - Files are renamed to a random 32-character name, so a user can never
      choose the path or overwrite another file.
    - Files go to storage/uploads/. storage/.htaccess blocks direct
      access in Apache (XAMPP), so files can only be opened through
      api/resources.php, which checks permissions first.
      Change the folder with the EDUMEET_UPLOAD_DIR variable.
    - PHP's own limits must allow 25 MB too:
      upload_max_filesize=25M and post_max_size=60M
      (XAMPP's default php.ini already allows 40M).
*/
class FileStorage {
    public const MAX_BYTES = 25 * 1024 * 1024;

    // extension => MIME type sent back when the file is viewed or downloaded
    public const ALLOWED = [
        'pdf'  => 'application/pdf',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'ppt'  => 'application/vnd.ms-powerpoint',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'xls'  => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'zip'  => 'application/zip',
    ];

    // The "File Type" filter groups extensions together.
    public const TYPE_GROUPS = [
        'pdf'   => ['pdf'],
        'doc'   => ['doc', 'docx'],
        'slide' => ['ppt', 'pptx'],
        'sheet' => ['xls', 'xlsx'],
        'image' => ['png', 'jpg', 'jpeg'],
        'zip'   => ['zip'],
    ];

    // Types the browser can show inline on the View File page.
    public const VIEWABLE = ['pdf', 'png', 'jpg', 'jpeg'];

    private string $dir;
    /** @var callable(string, string): bool */
    private $mover;

    public function __construct(?string $dir = null, ?callable $mover = null) {
        $this->dir = rtrim($dir ?? (getenv('EDUMEET_UPLOAD_DIR') ?: dirname(__DIR__) . '/storage/uploads'), '/\\');
        // Tests swap this out, because move_uploaded_file only accepts real uploads.
        $this->mover = $mover ?? 'move_uploaded_file';
    }

    /*
        Turns PHP's $_FILES['files'] into a simple list, whether one or
        many files were sent:
        [['name' => ..., 'tmp_name' => ..., 'size' => ..., 'error' => ...], ...]
    */
    public static function normalize(?array $entry): array {
        if ($entry === null || !isset($entry['name'])) {
            return [];
        }
        if (!is_array($entry['name'])) {
            return $entry['error'] === UPLOAD_ERR_NO_FILE ? [] : [$entry];
        }
        $files = [];
        foreach ($entry['name'] as $i => $name) {
            if ($entry['error'][$i] === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            $files[] = [
                'name'     => $name,
                'tmp_name' => $entry['tmp_name'][$i],
                'size'     => $entry['size'][$i],
                'error'    => $entry['error'][$i],
            ];
        }
        return $files;
    }

    // Returns an error message for the user, or null if the file is fine.
    public function validate(array $file): ?string {
        $name = (string) ($file['name'] ?? '');
        switch ($file['error'] ?? UPLOAD_ERR_NO_FILE) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return "$name is over the 25 MB limit.";
            case UPLOAD_ERR_PARTIAL:
                return "$name didn't finish uploading. Please try again.";
            default:
                return "$name couldn't be uploaded.";
        }
        if (!array_key_exists(self::extensionOf($name), self::ALLOWED)) {
            return "$name isn't an allowed file type. Use PDF, DOCX, PPTX, XLSX, PNG, JPG or ZIP.";
        }
        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0) {
            return "$name is empty.";
        }
        if ($size > self::MAX_BYTES) {
            return "$name is over the 25 MB limit.";
        }
        return null;
    }

    /*
        Moves a validated upload into storage. Returns the details to save
        in the database.
    */
    public function store(array $file): array {
        $error = $this->validate($file);
        if ($error !== null) {
            throw new InvalidArgumentException($error);
        }
        if (!is_dir($this->dir) && !mkdir($this->dir, 0750, true) && !is_dir($this->dir)) {
            throw new RuntimeException("Upload folder can't be created: {$this->dir}");
        }
        $extension = self::extensionOf($file['name']);
        $storedName = bin2hex(random_bytes(16));
        if (!($this->mover)($file['tmp_name'], $this->dir . DIRECTORY_SEPARATOR . $storedName)) {
            throw new RuntimeException("Couldn't save {$file['name']}.");
        }
        return [
            'original_name' => self::cleanName($file['name']),
            'stored_name'   => $storedName,
            'extension'     => $extension,
            'mime_type'     => self::ALLOWED[$extension],
            'size_bytes'    => (int) $file['size'],
        ];
    }

    public function path(string $storedName): string {
        // Only names made by store() are accepted, so "../" tricks can't reach other files.
        if (!preg_match('/^[a-f0-9]{32}$/', $storedName)) {
            throw new InvalidArgumentException("Invalid stored file name.");
        }
        return $this->dir . DIRECTORY_SEPARATOR . $storedName;
    }

    public function delete(string $storedName): void {
        $path = $this->path($storedName);
        if (is_file($path)) {
            unlink($path);
        }
    }

    public static function extensionOf(string $name): string {
        return strtolower(pathinfo($name, PATHINFO_EXTENSION));
    }

    // Removes folders and control characters from a user-supplied file name.
    public static function cleanName(string $name): string {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        $name = trim($name);
        $name = function_exists('mb_substr') ? mb_substr($name, 0, 255) : substr($name, 0, 255);
        return $name !== '' ? $name : 'file';
    }

    // "2.4 MB", "540 KB" — the format used in the tables.
    public static function sizeLabel(int $bytes): string {
        if ($bytes >= 1024 * 1024) {
            return rtrim(rtrim(number_format($bytes / 1048576, 1), '0'), '.') . ' MB';
        }
        return max(1, (int) round($bytes / 1024)) . ' KB';
    }
}
