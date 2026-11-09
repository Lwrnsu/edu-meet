
<?php

class JsonManager
{
    private PDO $pdo;
    private ClassModel $classModel;
    private Deck $deckModel;
    private Flashcard $flashcardModel;

    public function __construct(
        PDO $pdo,
        ClassModel $classModel,
        Deck $deckModel,
        Flashcard $flashcardModel
    ) {
        $this->pdo = $pdo;
        $this->classModel = $classModel;
        $this->deckModel = $deckModel;
        $this->flashcardModel = $flashcardModel;
    }

    // EXPORT DECK TO JSON
    public function exportDeck(int $deckId, string $filePath): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT
                d.id,
                d.name,
                d.description,
                c.name AS class_name
            FROM decks d
            INNER JOIN classes c ON d.class_id = c.id
            WHERE d.id = :id
        ");

        $stmt->execute([':id' => $deckId]);

        $deck = $stmt->fetch();

        if (!$deck) {
            throw new RuntimeException("Deck not found.");
        }

        $cards = $this->flashcardModel->getByDeck($deckId);

        $flashcards = [];

        foreach ($cards as $card) {
            $flashcards[] = [
                'question' => $card['question'],
                'answer' => $card['answer'],
                'explanation' => $card['explanation'],
                'difficulty' => $card['difficulty']
            ];
        }

        $data = [
            'class' => $deck['class_name'],
            'deck' => $deck['name'],
            'description' => $deck['description'],
            'flashcards' => $flashcards
        ];

        $json = json_encode(
            $data,
            JSON_PRETTY_PRINT |
            JSON_UNESCAPED_UNICODE |
            JSON_THROW_ON_ERROR
        );

        $directory = dirname($filePath);

        if (!is_dir($directory)) {
            throw new RuntimeException(
                "Export directory does not exist."
            );
        }

        $result = file_put_contents($filePath, $json);

        return $result !== false;
    }

    // IMPORT JSON AS A NEW CLASS AND DECK
    public function importDeck(string $filePath): array
    {
        if (!is_file($filePath)) {
            throw new RuntimeException("JSON file not found.");
        }

        $json = file_get_contents($filePath);

        if ($json === false) {
            throw new RuntimeException("Unable to read JSON file.");
        }

        $data = json_decode(
            $json,
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        if (
            !is_array($data) ||
            empty($data['class']) ||
            empty($data['deck']) ||
            !isset($data['flashcards']) ||
            !is_array($data['flashcards'])
        ) {
            throw new InvalidArgumentException(
                "Invalid reviewer JSON structure."
            );
        }

        $className = trim($data['class']);
        $deckName = trim($data['deck']);

        if ($className === '' || $deckName === '') {
            throw new InvalidArgumentException(
                "Class and deck names are required."
            );
        }

        if (count($data['flashcards']) === 0) {
            throw new InvalidArgumentException(
                "The JSON file contains no flashcards."
            );
        }

        // Validate all cards before importing.
        foreach ($data['flashcards'] as $card) {

            if (
                !is_array($card) ||
                !isset($card['question']) ||
                !isset($card['answer']) ||
                !is_string($card['question']) ||
                !is_string($card['answer']) ||
                trim($card['question']) === '' ||
                trim($card['answer']) === ''
            ) {
                throw new InvalidArgumentException(
                    "Every flashcard needs a question and answer."
                );
            }

            $difficulty = $card['difficulty'] ?? 'medium';

            if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
                throw new InvalidArgumentException(
                    "Invalid flashcard difficulty."
                );
            }
        }

        $this->pdo->beginTransaction();

        try {

            $classId = $this->classModel->create(
                $className,
                "Imported reviewer"
            );

            $deckId = $this->deckModel->create(
                $classId,
                $deckName,
                $data['description'] ?? null
            );

            $importedCount = 0;

            foreach ($data['flashcards'] as $card) {

                $this->flashcardModel->create(
                    $deckId,
                    trim($card['question']),
                    trim($card['answer']),
                    $card['explanation'] ?? null,
                    $card['difficulty'] ?? 'medium'
                );

                $importedCount++;
            }

            $this->pdo->commit();

            return [
                'class_id' => $classId,
                'deck_id' => $deckId,
                'imported_flashcards' => $importedCount
            ];

        } catch (Throwable $e) {

            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }
    }
}
