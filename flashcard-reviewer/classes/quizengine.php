
<?php

class QuizEngine
{
    private PDO $pdo;
    private Flashcard $flashcard;
    private StudySession $studySession;

    public function __construct(
        PDO $pdo,
        Flashcard $flashcard,
        StudySession $studySession
    ) {
        $this->pdo = $pdo;
        $this->flashcard = $flashcard;
        $this->studySession = $studySession;
    }

    // NORMALIZE ANSWERS
    // Ignore capitalization and unnecessary spaces.
    private function normalizeAnswer(string $answer): string
    {
        $answer = trim($answer);

        $answer = preg_replace('/\s+/', ' ', $answer);

        if (function_exists('mb_strtolower')) {
            return mb_strtolower($answer, 'UTF-8');
        }

        return strtolower($answer);
    }

    // IDENTIFY QUESTION TYPE
    public function getQuestionType(string $question): string
    {
        if (strpos($question, '__________') !== false) {
            return 'fill_blank';
        }

        return 'identification';
    }

    // START A NEW QUIZ
    public function start(
        int $deckId,
        bool $shuffle = true
    ): array {

        if ($deckId < 1) {
            throw new InvalidArgumentException(
                "Invalid deck ID."
            );
        }

        // Retrieve flashcards from the selected deck.
        $cards = $this->flashcard->getByDeck($deckId);

        if (empty($cards)) {
            throw new RuntimeException(
                "This deck has no flashcards."
            );
        }

        // Shuffle questions if requested.
        if ($shuffle) {
            shuffle($cards);
        }

        // Create a new study session.
        $sessionId = $this->studySession->create(
            $deckId,
            count($cards)
        );

        // Prepare quiz questions.
        $questions = [];

        foreach ($cards as $card) {

            $questions[] = [
                'id' => (int) $card['id'],
                'question' => $card['question'],
                'type' => $this->getQuestionType(
                    $card['question']
                ),
                'difficulty' => $card['difficulty'] ?? 'medium'
            ];
        }

        return [
            'session_id' => $sessionId,
            'deck_id' => $deckId,
            'total_questions' => count($questions),
            'questions' => $questions
        ];
    }

    // CHECK USER ANSWER
    public function submitAnswer(
        int $sessionId,
        int $flashcardId,
        string $userAnswer
    ): array {

        // Validate submitted answer.
        $userAnswer = trim($userAnswer);

        if ($userAnswer === '') {
            throw new InvalidArgumentException(
                "Please enter an answer."
            );
        }

        // Verify quiz session.
        $session = $this->studySession->getById($sessionId);

        if (!$session || $session['status'] !== 'ongoing') {
            throw new RuntimeException(
                "Invalid or completed quiz session."
            );
        }

        // Verify that the flashcard belongs to the session's deck.
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM flashcards
            WHERE id = :card_id
            AND deck_id = :deck_id
        ");

        $stmt->execute([
            ':card_id' => $flashcardId,
            ':deck_id' => $session['deck_id']
        ]);

        $card = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$card) {
            throw new RuntimeException(
                "Flashcard does not belong to this session."
            );
        }

        // Verify that this flashcard was included
        // in the selected quiz session.
        $stmt = $this->pdo->prepare("
            SELECT flashcard_id
            FROM study_session_answers
            WHERE session_id = :session_id
            AND flashcard_id = :card_id
        ");

        $stmt->execute([
            ':session_id' => $sessionId,
            ':card_id' => $flashcardId
        ]);

        if ($stmt->fetch()) {
            throw new RuntimeException(
                "This question has already been answered."
            );
        }

        // Compare answers.
        $normalizedUserAnswer = $this->normalizeAnswer(
            $userAnswer
        );

        $normalizedCorrectAnswer = $this->normalizeAnswer(
            $card['answer']
        );

        $isCorrect = (
            $normalizedUserAnswer === $normalizedCorrectAnswer
        );

        // Save submitted answer.
        $this->studySession->recordAnswer(
            $sessionId,
            $flashcardId,
            $card['question'],
            $card['answer'],
            $userAnswer,
            $isCorrect
        );

        // Return answer feedback.
        return [
            'correct' => $isCorrect,
            'status' => $isCorrect ? 'correct' : 'incorrect',
            'user_answer' => $userAnswer,
            'correct_answer' => $card['answer'],
            'explanation' => $card['explanation'] ?? '',
            'question_type' => $this->getQuestionType(
                $card['question']
            )
        ];
    }

    // FINISH QUIZ
    public function finish(int $sessionId): array
    {
        $session = $this->studySession->getById($sessionId);

        if (!$session || $session['status'] !== 'ongoing') {
            throw new RuntimeException(
                "Invalid or completed quiz session."
            );
        }

        // Retrieve submitted answers.
        $answers = $this->studySession->getAnswers($sessionId);

        $answered = count($answers);
        $total = (int) $session['total_questions'];

        // Require all questions to be answered.
        if ($answered !== $total) {
            throw new RuntimeException(
                "Please answer all questions before finishing."
            );
        }

        // Calculate and save final score.
        $this->studySession->complete($sessionId);

        // Return completed session.
        return $this->studySession->getById($sessionId);
    }

    // GET QUIZ SESSION
    public function getSession(int $sessionId): ?array
    {
        return $this->studySession->getById($sessionId);
    }

    // GET QUIZ ANSWERS
    public function getSessionAnswers(int $sessionId): array
    {
        return $this->studySession->getAnswers($sessionId);
    }
}