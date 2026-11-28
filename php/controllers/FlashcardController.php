<?php
// Write an API that when called, run the intended function to use.
// Example, the user wants to create a Deck. Then there's an API here that
// create an Object Deck then call the function of Create. After that, returns
// an Object to Front-End (status, code, message, data(if there's any, optional unless
// giving front-end a data like lists of decks, flashcards, etc.)).

// NOTE: I created a class ApiResponse for you to send response to the user
//       after calling the API.

require_once __DIR__ . '/../models/ApiResponse.php';
require_once __DIR__ . '/../models/Flashcard.php';

class FlashcardController
{
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

        $path  = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
        $input = $this->readInput();

        switch ($path) {
            case '/api/php/get/flashcards':
                $response = $this->getFlashcardsByDeck($input);
                break;
            case '/api/php/get/flashcard':
                $response = $this->getFlashcardById($input);
                break;
            case '/api/php/add/flashcards':
                $response = $this->createFlashcard($input);
                break;
            case '/api/php/update/flashcards':
                $response = $this->updateFlashcard($input);
                break;
            case '/api/php/delete/flashcards':
                $response = $this->deleteFlashcard($input);
                break;
            case '/api/php/reorder/flashcards':
                $response = $this->reorderFlashcards($input);
                break;
            default:
                $response = new ApiResponse(false, 404, 'Endpoint not found', []);
        }

        $this->send($response);
    }

    // GET reads the query string, POST also reads the JSON body.
    private function readInput(): array
    {
        $input = $_GET;
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $json = json_decode(file_get_contents('php://input'), true);
            $input = array_merge($input, $_POST, is_array($json) ? $json : []);
        }
        return $input;
    }

    // Outputs the ApiResponse as JSON.
    private function send(ApiResponse $response): void
    {
        http_response_code($response->code);
        echo json_encode($response);
    }

    // CREATE FLASHCARD
    // $input: deck_id, question, answer, explanation (optional), difficulty (optional)
    public function createFlashcard(array $input): ApiResponse
    {
        if (empty($input['deck_id']) || empty(trim($input['question'] ?? '')) || empty(trim($input['answer'] ?? ''))) {
            return new ApiResponse(false, 400, "deck_id, question and answer are required", []);
        }

        try {
            $flashcard = new Flashcard();
            $newId = $flashcard->create(
                (int) $input['deck_id'],
                $input['question'],
                $input['answer'],
                $input['explanation'] ?? null,
                $input['difficulty'] ?? 'medium'
            );

            return new ApiResponse(true, 201, "Flashcard created successfully", ['id' => $newId]);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to create flashcard", []);
        }
    }

    // GET ALL FLASHCARDS OF A DECK (used by the reviewer)
    // $input: deck_id
    public function getFlashcardsByDeck(array $input): ApiResponse
    {
        if (empty($input['deck_id'])) {
            return new ApiResponse(false, 400, "deck_id is required", []);
        }

        try {
            $flashcard = new Flashcard();
            $cards = $flashcard->getByDeck((int) $input['deck_id']);

            return new ApiResponse(true, 200, "Flashcards retrieved", $cards);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve flashcards", []);
        }
    }

    // GET ONE FLASHCARD
    // $input: id
    public function getFlashcardById(array $input): ApiResponse
    {
        if (empty($input['id'])) {
            return new ApiResponse(false, 400, "id is required", []);
        }

        try {
            $flashcard = new Flashcard();
            $card = $flashcard->getById((int) $input['id']);

            if ($card === null) {
                return new ApiResponse(false, 404, "Flashcard not found", []);
            }
            return new ApiResponse(true, 200, "Flashcard retrieved", $card);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve flashcard", []);
        }
    }

    // UPDATE FLASHCARD
    // $input: id, question, answer, explanation (optional), difficulty (optional)
    public function updateFlashcard(array $input): ApiResponse
    {
        if (empty($input['id']) || empty(trim($input['question'] ?? '')) || empty(trim($input['answer'] ?? ''))) {
            return new ApiResponse(false, 400, "id, question and answer are required", []);
        }

        try {
            $flashcard = new Flashcard();

            if ($flashcard->getById((int) $input['id']) === null) {
                return new ApiResponse(false, 404, "Flashcard not found", []);
            }

            $flashcard->update(
                (int) $input['id'],
                $input['question'],
                $input['answer'],
                $input['explanation'] ?? null,
                $input['difficulty'] ?? 'medium'
            );

            return new ApiResponse(true, 200, "Flashcard updated successfully", []);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to update flashcard", []);
        }
    }

    // DELETE FLASHCARD
    // $input: id
    public function deleteFlashcard(array $input): ApiResponse
    {
        if (empty($input['id'])) {
            return new ApiResponse(false, 400, "id is required", []);
        }

        try {
            $flashcard = new Flashcard();

            if ($flashcard->getById((int) $input['id']) === null) {
                return new ApiResponse(false, 404, "Flashcard not found", []);
            }

            $flashcard->delete((int) $input['id']);

            return new ApiResponse(true, 200, "Flashcard deleted successfully", []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to delete flashcard", []);
        }
    }

    // REORDER FLASHCARDS IN A DECK
    // $input: deck_id, card_ids (array of flashcard ids in the new order)
    public function reorderFlashcards(array $input): ApiResponse
    {
        if (empty($input['deck_id']) || empty($input['card_ids']) || !is_array($input['card_ids'])) {
            return new ApiResponse(false, 400, "deck_id and card_ids (array) are required", []);
        }

        try {
            $flashcard = new Flashcard();
            $flashcard->reorder($input['card_ids'], (int) $input['deck_id']);

            return new ApiResponse(true, 200, "Flashcards reordered successfully", []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to reorder flashcards", []);
        }
    }
}