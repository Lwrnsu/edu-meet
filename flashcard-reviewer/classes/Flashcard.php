
<?php

class Flashcard
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // CREATE FLASHCARD
    public function create(
        int $deckId,
        string $question,
        string $answer,
        ?string $explanation = null,
        string $difficulty = 'medium'
    ): int {

        $allowedDifficulties = ['easy', 'medium', 'hard'];

        if (!in_array($difficulty, $allowedDifficulties, true)) {
            throw new InvalidArgumentException("Invalid difficulty.");
        }

        $sql = "
            INSERT INTO flashcards
            (deck_id, question, answer, explanation, difficulty)
            VALUES
            (:deck_id, :question, :answer, :explanation, :difficulty)
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            ':deck_id' => $deckId,
            ':question' => trim($question),
            ':answer' => trim($answer),
            ':explanation' => $explanation,
            ':difficulty' => $difficulty
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // GET FLASHCARDS FROM A DECK
    public function getByDeck(int $deckId): array
    {
        $sql = "
            SELECT *
            FROM flashcards
            WHERE deck_id = :deck_id
            ORDER BY position ASC, id ASC
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([':deck_id' => $deckId]);

        return $stmt->fetchAll();
    }

    // GET SINGLE FLASHCARD
    public function getById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM flashcards WHERE id = :id"
        );

        $stmt->execute([':id' => $id]);

        $result = $stmt->fetch();

        return $result ?: null;
    }

    // UPDATE FLASHCARD
    public function update(
        int $id,
        string $question,
        string $answer,
        ?string $explanation = null,
        string $difficulty = 'medium'
    ): bool {

        if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
            throw new InvalidArgumentException("Invalid difficulty.");
        }

        $sql = "
            UPDATE flashcards
            SET question = :question,
                answer = :answer,
                explanation = :explanation,
                difficulty = :difficulty
            WHERE id = :id
        ";

        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute([
            ':id' => $id,
            ':question' => trim($question),
            ':answer' => trim($answer),
            ':explanation' => $explanation,
            ':difficulty' => $difficulty
        ]);
    }

    // DELETE FLASHCARD
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare(
            "DELETE FROM flashcards WHERE id = :id"
        );

        return $stmt->execute([':id' => $id]);
    }

    // REORDER FLASHCARDS
    public function reorder(array $cardIds, int $deckId): void
    {
        $this->pdo->beginTransaction();

        try {
            $stmt = $this->pdo->prepare(
                "UPDATE flashcards
                 SET position = :position
                 WHERE id = :id AND deck_id = :deck_id"
            );

            foreach ($cardIds as $position => $cardId) {
                $stmt->execute([
                    ':position' => $position,
                    ':id' => (int) $cardId,
                    ':deck_id' => $deckId
                ]);
            }

            $this->pdo->commit();

        } catch (Throwable $e) {

            $this->pdo->rollBack();

            throw $e;
        }
    }
}
