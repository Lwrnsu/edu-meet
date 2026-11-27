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
require_once __DIR__ . '/../services/StudySession.php';
require_once __DIR__ . '/../services/QuizEngine.php';

class QuizReviewController
{
    // QuizEngine needs a Flashcard and a StudySession, so build them here
    private function makeEngine(): QuizEngine
    {
        return new QuizEngine(new Flashcard(), new StudySession());
    }

    // START A QUIZ
    // $input: deck_id, shuffle (optional, default true)
    public function startQuiz(array $input): ApiResponse
    {
        if (empty($input['deck_id'])) {
            return new ApiResponse(false, 400, "deck_id is required", []);
        }

        try {
            $engine = $this->makeEngine();
            $shuffle = isset($input['shuffle'])
                ? filter_var($input['shuffle'], FILTER_VALIDATE_BOOLEAN)
                : true;

            $quiz = $engine->start((int) $input['deck_id'], $shuffle);

            return new ApiResponse(true, 201, "Quiz started", $quiz);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (RuntimeException $e) {
            return new ApiResponse(false, 409, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to start quiz", []);
        }
    }

    // SUBMIT AN ANSWER (the engine checks if it is correct)
    // $input: session_id, flashcard_id, user_answer
    public function submitAnswer(array $input): ApiResponse
    {
        if (empty($input['session_id']) || empty($input['flashcard_id'])) {
            return new ApiResponse(false, 400, "session_id and flashcard_id are required", []);
        }

        try {
            $engine = $this->makeEngine();
            $feedback = $engine->submitAnswer(
                (int) $input['session_id'],
                (int) $input['flashcard_id'],
                (string) ($input['user_answer'] ?? '')
            );

            return new ApiResponse(true, 200, "Answer checked", $feedback);
        } catch (InvalidArgumentException $e) {
            return new ApiResponse(false, 400, $e->getMessage(), []);
        } catch (RuntimeException $e) {
            return new ApiResponse(false, 409, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to submit answer", []);
        }
    }

    // FINISH THE QUIZ AND GET THE SCORE
    // $input: session_id
    public function finishQuiz(array $input): ApiResponse
    {
        if (empty($input['session_id'])) {
            return new ApiResponse(false, 400, "session_id is required", []);
        }

        try {
            $engine = $this->makeEngine();
            $result = $engine->finish((int) $input['session_id']);

            return new ApiResponse(true, 200, "Quiz completed", $result);
        } catch (RuntimeException $e) {
            return new ApiResponse(false, 409, $e->getMessage(), []);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to finish quiz", []);
        }
    }

    // GET QUIZ SESSION DETAILS
    // $input: session_id
    public function getQuizSession(array $input): ApiResponse
    {
        if (empty($input['session_id'])) {
            return new ApiResponse(false, 400, "session_id is required", []);
        }

        try {
            $engine = $this->makeEngine();
            $session = $engine->getSession((int) $input['session_id']);

            if ($session === null) {
                return new ApiResponse(false, 404, "Quiz session not found", []);
            }
            return new ApiResponse(true, 200, "Quiz session retrieved", $session);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve quiz session", []);
        }
    }

    // GET ALL ANSWERS OF A QUIZ (used for the results / review page)
    // $input: session_id
    public function getQuizAnswers(array $input): ApiResponse
    {
        if (empty($input['session_id'])) {
            return new ApiResponse(false, 400, "session_id is required", []);
        }

        try {
            $engine = $this->makeEngine();

            if ($engine->getSession((int) $input['session_id']) === null) {
                return new ApiResponse(false, 404, "Quiz session not found", []);
            }

            $answers = $engine->getSessionAnswers((int) $input['session_id']);

            return new ApiResponse(true, 200, "Quiz answers retrieved", $answers);
        } catch (Throwable $e) {
            return new ApiResponse(false, 500, "Failed to retrieve quiz answers", []);
        }
    }
}