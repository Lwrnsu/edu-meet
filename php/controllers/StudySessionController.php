<?php
// Write an API that when called, run the intended function to use.
// Example, the user wants to create a Deck. Then there's an API here that
// create an Object Deck then call the function of Create. After that, returns
// an Object to Front-End (status, code, message, data(if there's any, optional unless
// giving front-end a data like lists of decks, flashcards, etc.)).

// NOTE: I created a class ApiResponse for you to send response to the user
//       after calling the API.

require_once __DIR__ . '/../models/ApiResponse.php';
require_once __DIR__ . '/../services/StudySession.php';

class StudySessionController
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
            case '/api/php/start/session':
                $response = $this->startSession($input);
                break;
            case '/api/php/record/session-answer':
                $response = $this->recordAnswer($input);
                break;
            case '/api/php/complete/session':
                $response = $this->completeSession($input);
                break;
            case '/api/php/abandon/session':
                $response = $this->abandonSession($input);
                break;
            case '/api/php/get/session':
                $response = $this->getSession($input);
                break;
            case '/api/php/get/session-answers':
                $response = $this->getSessionAnswers($input);
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

    // START A NEW SESSION
    // $input: deck_id, total_questions
    public function startSession(array $input): ApiResponse
    {
        if (empty($input['deck_id']) || empty($input['total_questions']) || (int) $input['total_questions'] < 1) {
            return new ApiResponse(false, 400, "deck_id and total_questions (at least 1) are required", []);
        }

        try {
            $session = new StudySession();
            $newId = $session->create((int) $input['deck_id'], (int) $input['total_questions']);

            return new ApiResponse(true, 201, "Study session started", ['id' => $newId]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to start study session", []);
        }
    }

    // SAVE AN ANSWER
    // $input: session_id, flashcard_id, question, correct_answer, user_answer, is_correct
    public function recordAnswer(array $input): ApiResponse
    {
        if (
            empty($input['session_id']) || empty($input['flashcard_id'])
            || empty(trim($input['question'] ?? '')) || empty(trim($input['correct_answer'] ?? ''))
            || !array_key_exists('user_answer', $input) || !array_key_exists('is_correct', $input)
        ) {
            return new ApiResponse(false, 400, "session_id, flashcard_id, question, correct_answer, user_answer and is_correct are required", []);
        }

        try {
            $session = new StudySession();
            $current = $session->getById((int) $input['session_id']);

            if ($current === null) {
                return new ApiResponse(false, 404, "Session not found", []);
            }
            if ($current['status'] !== 'ongoing') {
                return new ApiResponse(false, 409, "Session is already " . $current['status'], []);
            }

            $answerId = $session->recordAnswer(
                (int) $input['session_id'],
                (int) $input['flashcard_id'],
                $input['question'],
                $input['correct_answer'],
                (string) $input['user_answer'],
                filter_var($input['is_correct'], FILTER_VALIDATE_BOOLEAN)
            );

            return new ApiResponse(true, 201, "Answer recorded", ['id' => $answerId]);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to record answer", []);
        }
    }

    // GET SESSION DETAILS
    // $input: id
    public function getSession(array $input): ApiResponse
    {
        if (empty($input['id'])) {
            return new ApiResponse(false, 400, "id is required", []);
        }

        try {
            $session = new StudySession();
            $result = $session->getById((int) $input['id']);

            if ($result === null) {
                return new ApiResponse(false, 404, "Session not found", []);
            }
            return new ApiResponse(true, 200, "Session retrieved", $result);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve session", []);
        }
    }

    // GET ALL ANSWERS OF A SESSION
    // $input: session_id
    public function getSessionAnswers(array $input): ApiResponse
    {
        if (empty($input['session_id'])) {
            return new ApiResponse(false, 400, "session_id is required", []);
        }

        try {
            $session = new StudySession();

            if ($session->getById((int) $input['session_id']) === null) {
                return new ApiResponse(false, 404, "Session not found", []);
            }

            $answers = $session->getAnswers((int) $input['session_id']);

            return new ApiResponse(true, 200, "Answers retrieved", $answers);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve answers", []);
        }
    }

    // COMPLETE SESSION AND CALCULATE SCORE
    // $input: session_id
    public function completeSession(array $input): ApiResponse
    {
        if (empty($input['session_id'])) {
            return new ApiResponse(false, 400, "session_id is required", []);
        }

        try {
            $session = new StudySession();
            $session->complete((int) $input['session_id']);

            // return the finished session so React can show the score
            $result = $session->getById((int) $input['session_id']);

            return new ApiResponse(true, 200, "Session completed", $result ?? []);
        } catch (RuntimeException $e) {
            return new ApiResponse(false, 409, "Session not found or already finished", []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to complete session", []);
        }
    }

    // ABANDON SESSION
    // $input: session_id
    public function abandonSession(array $input): ApiResponse
    {
        if (empty($input['session_id'])) {
            return new ApiResponse(false, 400, "session_id is required", []);
        }

        try {
            $session = new StudySession();
            $current = $session->getById((int) $input['session_id']);

            if ($current === null) {
                return new ApiResponse(false, 404, "Session not found", []);
            }
            if ($current['status'] !== 'ongoing') {
                return new ApiResponse(false, 409, "Session is already " . $current['status'], []);
            }

            $session->abandon((int) $input['session_id']);

            return new ApiResponse(true, 200, "Session abandoned", []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to abandon session", []);
        }
    }
}