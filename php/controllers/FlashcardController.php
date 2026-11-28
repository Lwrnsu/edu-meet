<?php

require_once __DIR__ . '/../../shared/ApiResponse.php';
require_once __DIR__ . '/../../../classes/Flashcard.php';
require_once __DIR__ . '/JsonImportController.php';

class FlashcardController
{
    private Flashcard $flashcard;
    private JsonImportController $jsonImportController;

    public function __construct(PDO $pdo)
    {
        $this->flashcard = new Flashcard($pdo);
        $this->jsonImportController = new JsonImportController($pdo);
    }

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

        // Read route from the URL query parameter.
        $path = '/' . trim($_GET['route'] ?? '', '/');

        $input = $this->readInput();

        switch ($path) {
            case '/get/flashcards':
                $this->getFlashcardsByDeck($input);
                break;

            case '/get/flashcard':
                $this->getFlashcardById($input);
                break;

            case '/add/flashcards':
                $this->createFlashcard($input);
                break;

            case '/update/flashcards':
                $this->updateFlashcard($input);
                break;

            case '/delete/flashcards':
                $this->deleteFlashcard($input);
                break;

            case '/reorder/flashcards':
                $this->reorderFlashcards($input);
                break;

            case '/import/json':
                $this->jsonImportController->import();
                break;

            default:
                $this->send(new ApiResponse(false, 404, 'Endpoint not found', []));
                break;
        }
    }

    private function send(ApiResponse $res): void
    {
        http_response_code($res->code);
        echo json_encode($res);
    }

    private function readInput(): array
    {
        $input = $_GET;

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $rawBody = file_get_contents('php://input');
            $json = is_string($rawBody) && $rawBody !== ''
                ? json_decode($rawBody, true)
                : [];

            $input = array_merge(
                $input,
                $_POST,
                is_array($json) ? $json : []
            );
        }

        return $input;
    }

    // CREATE FLASHCARD
    public function createFlashcard(array $input): void
    {
        if (
            empty($input['deck_id']) ||
            empty(trim($input['question'] ?? '')) ||
            empty(trim($input['answer'] ?? ''))
        ) {
            $this->send(new ApiResponse(
                false,
                400,
                'deck_id, question and answer are required',
                []
            ));
            return;
        }

        try {
            $newId = $this->flashcard->create(
                (int) $input['deck_id'],
                $input['question'],
                $input['answer'],
                $input['explanation'] ?? null,
                $input['difficulty'] ?? 'medium'
            );

            $this->send(new ApiResponse(
                true,
                201,
                'Flashcard created successfully',
                ['id' => $newId]
            ));
        } catch (InvalidArgumentException $e) {
            $this->send(new ApiResponse(false, 400, $e->getMessage(), []));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(false, 500, 'Failed to create flashcard', []));
        }
    }

    // GET ALL FLASHCARDS OF A DECK
    public function getFlashcardsByDeck(array $input): void
    {
        if (empty($input['deck_id'])) {
            $this->send(new ApiResponse(false, 400, 'deck_id is required', []));
            return;
        }

        try {
            $cards = $this->flashcard->getByDeck(
                (int) $input['deck_id']
            );

            $this->send(new ApiResponse(true, 200, 'Flashcards retrieved', $cards));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(false, 500, 'Failed to retrieve flashcards', []));
        }
    }

    // GET ONE FLASHCARD
    public function getFlashcardById(array $input): void
    {
        if (empty($input['id'])) {
            $this->send(new ApiResponse(false, 400, 'id is required', []));
            return;
        }

        try {
            $card = $this->flashcard->getById((int) $input['id']);

            if ($card === null) {
                $this->send(new ApiResponse(false, 404, 'Flashcard not found', []));
                return;
            }

            $this->send(new ApiResponse(true, 200, 'Flashcard retrieved', $card));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(false, 500, 'Failed to retrieve flashcard', []));
        }
    }

    // UPDATE FLASHCARD
    public function updateFlashcard(array $input): void
    {
        if (
            empty($input['id']) ||
            empty(trim($input['question'] ?? '')) ||
            empty(trim($input['answer'] ?? ''))
        ) {
            $this->send(new ApiResponse(
                false,
                400,
                'id, question and answer are required',
                []
            ));
            return;
        }

        try {
            if ($this->flashcard->getById((int) $input['id']) === null) {
                $this->send(new ApiResponse(false, 404, 'Flashcard not found', []));
                return;
            }

            $this->flashcard->update(
                (int) $input['id'],
                $input['question'],
                $input['answer'],
                $input['explanation'] ?? null,
                $input['difficulty'] ?? 'medium'
            );

            $this->send(new ApiResponse(true, 200, 'Flashcard updated successfully', []));
        } catch (InvalidArgumentException $e) {
            $this->send(new ApiResponse(false, 400, $e->getMessage(), []));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(false, 500, 'Failed to update flashcard', []));
        }
    }

    // DELETE FLASHCARD
    public function deleteFlashcard(array $input): void
    {
        if (empty($input['id'])) {
            $this->send(new ApiResponse(false, 400, 'id is required', []));
            return;
        }

        try {
            if ($this->flashcard->getById((int) $input['id']) === null) {
                $this->send(new ApiResponse(false, 404, 'Flashcard not found', []));
                return;
            }

            $this->flashcard->delete((int) $input['id']);

            $this->send(new ApiResponse(true, 200, 'Flashcard deleted successfully', []));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(false, 500, 'Failed to delete flashcard', []));
        }
    }

    // REORDER FLASHCARDS
    public function reorderFlashcards(array $input): void
    {
        if (
            empty($input['deck_id']) ||
            empty($input['card_ids']) ||
            !is_array($input['card_ids'])
        ) {
            $this->send(new ApiResponse(
                false,
                400,
                'deck_id and card_ids (array) are required',
                []
            ));
            return;
        }

        try {
            $this->flashcard->reorder(
                $input['card_ids'],
                (int) $input['deck_id']
            );

            $this->send(new ApiResponse(true, 200, 'Flashcards reordered successfully', []));
        } catch (Throwable $e) {
            $this->send(new ApiResponse(false, 500, 'Failed to reorder flashcards', []));
        }
    }
}