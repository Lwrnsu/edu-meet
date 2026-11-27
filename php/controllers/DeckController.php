<?php
// Write an API that when called, run the intended function to use.
// Example, the user wants to create a Deck. Then there's an API here that
// create an Object Deck then call the function of Create. After that, returns
// an Object to Front-End (status, code, message, data(if there's any, optional unless
// giving front-end a data like lists of decks, flashcards, etc.)).

// NOTE: I created a class ApiResponse for you to send response to the user
//       after calling the API.

require_once __DIR__ . '/../models/ApiResponse.php';
require_once __DIR__ . '/../models/Deck.php';

class DeckController
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
            case '/api/get/decks':
                $response = $this->getDecks();
                break;
            case '/api/get/decks-by-class':
                $response = $this->getDecksByClass($input);
                break;
            case '/api/get/deck':
                $response = $this->getDeckById($input);
                break;
            case '/api/add/decks':
                $response = $this->createDeck($input);
                break;
            case '/api/update/decks':
                $response = $this->updateDeck($input);
                break;
            case '/api/delete/decks':
                $response = $this->deleteDeck($input);
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

    // CREATE DECK
    // $input: class_id, name, description (optional)
    public function createDeck(array $input): ApiResponse
    {
        if (empty($input['class_id']) || empty(trim($input['name'] ?? ''))) {
            return new ApiResponse(false, 400, "class_id and name are required", []);
        }

        try {
            $deck = new Deck();
            $newId = $deck->create(
                (int) $input['class_id'],
                $input['name'],
                $input['description'] ?? null
            );

            return new ApiResponse(true, 201, "Deck created successfully", ['id' => $newId]);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to create deck", []);
        }
    }

    // GET ALL DECKS
    public function getDecks(): ApiResponse
    {
        try {
            $deck = new Deck();
            $decks = $deck->getAll();

            return new ApiResponse(true, 200, "Decks retrieved", $decks);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve decks", []);
        }
    }

    // GET DECKS UNDER A CLASS
    // $input: class_id
    public function getDecksByClass(array $input): ApiResponse
    {
        if (empty($input['class_id'])) {
            return new ApiResponse(false, 400, "class_id is required", []);
        }

        try {
            $deck = new Deck();
            $decks = $deck->getByClass((int) $input['class_id']);

            return new ApiResponse(true, 200, "Decks retrieved", $decks);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve decks", []);
        }
    }

    // GET ONE DECK
    // $input: id
    public function getDeckById(array $input): ApiResponse
    {
        if (empty($input['id'])) {
            return new ApiResponse(false, 400, "id is required", []);
        }

        try {
            $deck = new Deck();
            $result = $deck->getById((int) $input['id']);

            if ($result === false) {
                return new ApiResponse(false, 404, "Deck not found", []);
            }
            return new ApiResponse(true, 200, "Deck retrieved", $result);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve deck", []);
        }
    }

    // UPDATE DECK
    // $input: id, class_id, name, description (optional)
    public function updateDeck(array $input): ApiResponse
    {
        if (empty($input['id']) || empty($input['class_id']) || empty(trim($input['name'] ?? ''))) {
            return new ApiResponse(false, 400, "id, class_id and name are required", []);
        }

        try {
            $deck = new Deck();

            if ($deck->getById((int) $input['id']) === false) {
                return new ApiResponse(false, 404, "Deck not found", []);
            }

            $deck->update(
                (int) $input['id'],
                (int) $input['class_id'],
                $input['name'],
                $input['description'] ?? null
            );

            return new ApiResponse(true, 200, "Deck updated successfully", []);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to update deck", []);
        }
    }

    // DELETE DECK
    // $input: id
    public function deleteDeck(array $input): ApiResponse
    {
        if (empty($input['id'])) {
            return new ApiResponse(false, 400, "id is required", []);
        }

        try {
            $deck = new Deck();

            if ($deck->getById((int) $input['id']) === false) {
                return new ApiResponse(false, 404, "Deck not found", []);
            }

            $deck->delete((int) $input['id']);

            return new ApiResponse(true, 200, "Deck deleted successfully", []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to delete deck", []);
        }
    }
}