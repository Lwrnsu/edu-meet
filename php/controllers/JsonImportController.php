PHP
<?php

require_once __DIR__ . '/../models/ClassModel.php';
require_once __DIR__ . '/../models/Deck.php';
require_once __DIR__ . '/../models/Flashcard.php';
require_once __DIR__ . '/../models/jsonmanager.php';

class JsonImportController
{
    private JsonManager $jsonManager;

    public function __construct(PDO $pdo)
    {
        $classModel = new ClassModel($pdo);
        $deckModel = new Deck($pdo);
        $flashcardModel = new Flashcard($pdo);

        $this->jsonManager = new JsonManager(
            $pdo,
            $classModel,
            $deckModel,
            $flashcardModel
        );
    }

    private function send(ApiResponse $res): void
    {
        http_response_code($res->code);
        echo json_encode($res);
    }

    public function import(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->send(new ApiResponse(
                false,
                405,
                'Only POST requests are allowed.',
                []
            ));
            return;
        }

        $tempFile = null;

        try {
            $file = $_FILES['json_file'] ?? null;
            $jsonText = trim($_POST['json_text'] ?? '');

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

            $this->send(new ApiResponse(
                true,
                201,
                'JSON imported successfully.',
                is_array($result) ? $result : ['data' => $result]
            ));
        } catch (InvalidArgumentException $e) {
            $this->send(new ApiResponse(
                false,
                400,
                $e->getMessage(),
                []
            ));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(
                false,
                500,
                'Failed to import JSON. Please check your file and try again.',
                []
            ));
        } finally {
            if ($tempFile !== null && file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }
}