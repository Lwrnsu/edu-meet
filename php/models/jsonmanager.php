<?php

require_once __DIR__ . '/ClassModel.php';
require_once __DIR__ . '/Deck.php';
require_once __DIR__ . '/Flashcard.php';

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

    /**
     * Export a deck and its flashcards into a JSON file.
     */
    public function exportDeck(int $deckId, string $filePath): bool
    {
        $deck = $this->deckModel->getById($deckId);

        if (!$deck) {
            throw new InvalidArgumentException("Deck not found.");
        }

        $flashcards = $this->flashcardModel->getByDeck($deckId);

        $class = $this->classModel->getById($deck['class_id']);

        if (!$class) {
            throw new InvalidArgumentException("Class not found.");
        }

        $data = [
            'class' => $class['name'],
            'deck' => $deck['name'],
            'description' => $deck['description'] ?? '',
            'flashcards' => []
        ];

        foreach ($flashcards as $flashcard) {
            $data['flashcards'][] = [
                'question' => $flashcard['question'],
                'answer' => $flashcard['answer'],
                'explanation' => $flashcard['explanation'] ?? '',
                'difficulty' => $flashcard['difficulty'] ?? 'medium'
            ];
        }

        $json = json_encode(
            $data,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        );

        if ($json === false) {
            throw new RuntimeException("Failed to encode JSON data.");
        }

        $result = file_put_contents($filePath, $json);

        if ($result === false) {
            throw new RuntimeException("Failed to save JSON file.");
        }

        return true;
    }

    /**
     * Import a class, deck, and flashcards from a JSON file.
     */
    public function importDeck(string $filePath): array
    {
        // Check if the JSON file exists.
        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw new InvalidArgumentException(
                "JSON file does not exist or cannot be read."
            );
        }

        // Read JSON file.
        $json = file_get_contents($filePath);

        if ($json === false) {
            throw new RuntimeException("Failed to read JSON file.");
        }

        // Decode JSON data.
        try {
            $data = json_decode(
                $json,
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        } catch (JsonException $e) {
            throw new InvalidArgumentException(
                "Invalid JSON format: " . $e->getMessage()
            );
        }

        // Validate the main JSON structure.
        if (
            !is_array($data) ||
            !isset($data['class'], $data['deck'], $data['flashcards']) ||
            !is_string($data['class']) ||
            !is_string($data['deck']) ||
            !is_array($data['flashcards'])
        ) {
            throw new InvalidArgumentException(
                "Invalid JSON structure. The file must contain class, deck, and flashcards."
            );
        }

        $className = trim($data['class']);
        $deckName = trim($data['deck']);
        $description = $data['description'] ?? '';

        // Validate class and deck names.
        if ($className === '' || $deckName === '') {
            throw new InvalidArgumentException(
                "Class name and deck name cannot be empty."
            );
        }

        if (!is_string($description)) {
            throw new InvalidArgumentException(
                "Deck description must be a string."
            );
        }

        if (empty($data['flashcards'])) {
            throw new InvalidArgumentException(
                "The JSON file must contain at least one flashcard."
            );
        }

        // Validate every flashcard before importing.
        foreach ($data['flashcards'] as $index => $card) {
            if (
                !is_array($card) ||
                !isset($card['question'], $card['answer']) ||
                !is_string($card['question']) ||
                !is_string($card['answer']) ||
                trim($card['question']) === '' ||
                trim($card['answer']) === ''
            ) {
                throw new InvalidArgumentException(
                    "Invalid question or answer in flashcard #" . ($index + 1) . "."
                );
            }

            $difficulty = $card['difficulty'] ?? 'medium';

            if (
                !is_string($difficulty) ||
                !in_array(
                    strtolower($difficulty),
                    ['easy', 'medium', 'hard'],
                    true
                )
            ) {
                throw new InvalidArgumentException(
                    "Invalid difficulty in flashcard #" . ($index + 1) .
                    ". Allowed values are easy, medium, or hard."
                );
            }
        }

        // Begin transaction only after validation.
        $this->pdo->beginTransaction();

        try {

            // PREVENT DUPLICATE CLASS AND DECK IMPORTS.
            // Class and deck names are compared without case sensitivity
            // and without considering extra spaces at the beginning/end.
            $duplicateCheck = $this->pdo->prepare("
                SELECT COUNT(*)
                FROM decks d
                INNER JOIN classes c ON d.class_id = c.id
                WHERE LOWER(TRIM(c.name)) = LOWER(:class_name)
                  AND LOWER(TRIM(d.name)) = LOWER(:deck_name)
            ");

            $duplicateCheck->execute([
                ':class_name' => $className,
                ':deck_name' => $deckName
            ]);

            if ((int) $duplicateCheck->fetchColumn() > 0) {
                throw new InvalidArgumentException(
                    "This class and deck already exist. Please rename them or choose a different JSON file."
                );
            }

            // Create class.
            $classId = $this->classModel->create(
                $className,
                "Imported reviewer"
            );

            // Create deck.
            $deckId = $this->deckModel->create(
                $classId,
                $deckName,
                $description
            );

            // Import flashcards.
            $importedCount = 0;

            foreach ($data['flashcards'] as $card) {
                $this->flashcardModel->create(
                    $deckId,
                    trim($card['question']),
                    trim($card['answer']),
                    $card['explanation'] ?? '',
                    strtolower($card['difficulty'] ?? 'medium')
                );

                $importedCount++;
            }

            // Save all changes.
            $this->pdo->commit();

            return [
                'success' => true,
                'class_id' => $classId,
                'deck_id' => $deckId,
                'imported_flashcards' => $importedCount
            ];

        } catch (Throwable $e) {

            // Undo all changes if something goes wrong.
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $e;
        }
    }
}