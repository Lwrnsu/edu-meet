
<?php

class StudySession
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // START A NEW SESSION
    public function create(int $deckId, int $totalQuestions): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO study_sessions
            (deck_id, total_questions, status)
            VALUES (:deck_id, :total_questions, 'ongoing')
        ");

        $stmt->execute([
            ':deck_id' => $deckId,
            ':total_questions' => $totalQuestions
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // SAVE AN ANSWER
    public function recordAnswer(
        int $sessionId,
        int $flashcardId,
        string $question,
        string $correctAnswer,
        string $userAnswer,
        bool $isCorrect
    ): int {

        $stmt = $this->pdo->prepare("
            INSERT INTO study_session_answers
            (
                session_id,
                flashcard_id,
                question_snapshot,
                correct_answer_snapshot,
                user_answer,
                is_correct
            )
            VALUES
            (
                :session_id,
                :flashcard_id,
                :question,
                :correct_answer,
                :user_answer,
                :is_correct
            )
        ");

        $stmt->execute([
            ':session_id' => $sessionId,
            ':flashcard_id' => $flashcardId,
            ':question' => $question,
            ':correct_answer' => $correctAnswer,
            ':user_answer' => $userAnswer,
            ':is_correct' => $isCorrect ? 1 : 0
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // GET SESSION DETAILS
    public function getById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM study_sessions
            WHERE id = :id
        ");

        $stmt->execute([':id' => $id]);

        $result = $stmt->fetch();

        return $result ?: null;
    }

    // GET ANSWERS FROM A SESSION
    public function getAnswers(int $sessionId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM study_session_answers
            WHERE session_id = :session_id
            ORDER BY answered_at ASC, id ASC
        ");

        $stmt->execute([':session_id' => $sessionId]);

        return $stmt->fetchAll();
    }

    // COMPLETE SESSION AND CALCULATE SCORE
    public function complete(int $sessionId): bool
    {
        $this->pdo->beginTransaction();

        try {

            $stmt = $this->pdo->prepare("
                SELECT
                    total_questions,
                    status
                FROM study_sessions
                WHERE id = :id
                FOR UPDATE
            ");

            $stmt->execute([':id' => $sessionId]);

            $session = $stmt->fetch();

            if (!$session || $session['status'] !== 'ongoing') {
                throw new RuntimeException("Session is not available.");
            }

            $stmt = $this->pdo->prepare("
                SELECT
                    COUNT(*) AS answered,
                    COALESCE(SUM(is_correct), 0) AS correct_count
                FROM study_session_answers
                WHERE session_id = :session_id
            ");

            $stmt->execute([':session_id' => $sessionId]);

            $result = $stmt->fetch();

            $correct = (int) $result['correct_count'];
            $incorrect = (int) $result['answered'] - $correct;
            $total = (int) $session['total_questions'];

            $percentage = $total > 0
                ? ($correct / $total) * 100
                : 0;

            $update = $this->pdo->prepare("
                UPDATE study_sessions
                SET correct_answers = :correct,
                    incorrect_answers = :incorrect,
                    score_percentage = :percentage,
                    status = 'completed',
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");

            $update->execute([
                ':correct' => $correct,
                ':incorrect' => $incorrect,
                ':percentage' => $percentage,
                ':id' => $sessionId
            ]);

            $this->pdo->commit();

            return true;

        } catch (Throwable $e) {

            $this->pdo->rollBack();

            throw $e;
        }
    }

    // ABANDON SESSION
    public function abandon(int $sessionId): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE study_sessions
            SET status = 'abandoned'
            WHERE id = :id
            AND status = 'ongoing'
        ");

        return $stmt->execute([':id' => $sessionId]);
    }
}
