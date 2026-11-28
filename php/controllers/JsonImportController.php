<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/ApiResponse.php';
require_once __DIR__ . '/../models/ClassModel.php';
require_once __DIR__ . '/../models/Deck.php';
require_once __DIR__ . '/../models/Flashcard.php';
require_once __DIR__ . '/../models/jsonmanager.php';

class JsonImportController
{
    private JsonManager $jsonManager;

    public function __construct()
    {
        $pdo = Database::connect();

        $this->jsonManager = new JsonManager(
            $pdo,
            new ClassModel($pdo),   // adjust if ClassModel no longer takes $pdo
            new Deck(),
            new Flashcard()
        );
    }

    // Routing lives here: maps the request path to the matching function.
    public function handle(): void
    {
        header('Content-Type: application/json; charset=UTF-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            return;
        }

        $path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

        switch ($path) {
            case '/api/php/import/json':
                $response = $this->import();
                break;
            default:
                $response = new ApiResponse(false, 404, 'Endpoint not found', []);
        }

        $this->send($response);
    }

    // Outputs the ApiResponse as JSON.
    private function send(ApiResponse $response): void
    {
        http_response_code($response->code);
        echo json_encode($response);
    }

    // IMPORT A DECK FROM A JSON FILE OR PASTED JSON
    // POST: json_file (uploaded file) OR json_text (pasted text), not both
    public function import(): ApiResponse
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            return new ApiResponse(false, 405, 'Only POST requests are allowed.', []);
        }

        $tempFile = null;

        try {
            $file = $_FILES['json_file'] ?? null;

            // json_text can come from a form post or from a JSON body
            $body = json_decode((string) file_get_contents('php://input'), true);
            $jsonText = trim((string) (
                $_POST['json_text'] ?? (is_array($body) ? ($body['json_text'] ?? '') : '')
            ));

            $hasFile = $file !== null &&
                $file['error'] !== UPLOAD_ERR_NO_FILE;

            $hasText = $jsonText !== '';

            if ($hasFile && $hasText) {
                throw new InvalidArgumentException(
                    'Please choose only one import method.'
                );
            }

            if (!$hasFile && !$hasText) {
                throw new InvalidArgumentException(
                    'Please upload a JSON file or paste JSON content.'
                );
            }

            // OPTION 1: Upload JSON file.
            if ($hasFile) {
                if ($file['error'] !== UPLOAD_ERR_OK) {
                    throw new InvalidArgumentException(
                        'File upload failed. Please try again.'
                    );
                }

                if ($file['size'] > 2 * 1024 * 1024) {
                    throw new InvalidArgumentException(
                        'File is too large. Maximum file size is 2 MB.'
                    );
                }

                $extension = strtolower(
                    pathinfo($file['name'], PATHINFO_EXTENSION)
                );

                if ($extension !== 'json') {
                    throw new InvalidArgumentException(
                        'Only JSON files are allowed.'
                    );
                }

                if (!is_uploaded_file($file['tmp_name'])) {
                    throw new InvalidArgumentException(
                        'Invalid uploaded file.'
                    );
                }

                $filePath = $file['tmp_name'];
            }

            // OPTION 2: Paste JSON content.
            else {
                if (strlen($jsonText) > 2 * 1024 * 1024) {
                    throw new InvalidArgumentException(
                        'JSON content is too large. Maximum size is 2 MB.'
                    );
                }

                $tempFile = tempnam(
                    sys_get_temp_dir(),
                    'json_import_'
                );

                if ($tempFile === false) {
                    throw new RuntimeException(
                        'Unable to process the pasted JSON content.'
                    );
                }

                if (file_put_contents($tempFile, $jsonText) === false) {
                    throw new RuntimeException(
                        'Unable to save the pasted JSON content.'
                    );
                }

                $filePath = $tempFile;
            }

            $result = $this->jsonManager->importDeck($filePath);

            return new ApiResponse(
                true,
                201,
                'JSON imported successfully.',
                is_array($result) ? $result : ['data' => $result]
            );
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(
                false,
                500,
                'Failed to import JSON. Please check your file and try again.',
                []
            );
        } finally {
            if ($tempFile !== null && file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }
}