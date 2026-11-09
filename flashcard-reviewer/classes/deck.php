
<?php

class Deck
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // CREATE DECK
    public function create(
        int $classId,
        string $name,
        ?string $description = null
    ): int {

        $name = trim($name);

        if ($name === '') {
            throw new InvalidArgumentException("Deck name is required.");
        }

        $sql = "
            INSERT INTO decks (class_id, name, description)
            VALUES (:class_id, :name, :description)
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            ':class_id' => $classId,
            ':name' => $name,
            ':description' => $description
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // GET ALL DECKS
    public function getAll(): array
    {
        $sql = "
            SELECT
                d.*,
                c.name AS class_name,
                COUNT(f.id) AS total_flashcards
            FROM decks d

            INNER JOIN classes c
                ON d.class_id = c.id

            LEFT JOIN flashcards f
                ON d.id = f.deck_id

            GROUP BY d.id

            ORDER BY d.created_at DESC
        ";

        return $this->pdo
            ->query($sql)
            ->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET DECKS UNDER A CLASS
    public function getByClass(int $classId): array
    {
        $sql = "
            SELECT
                d.*,
                c.name AS class_name,
                COUNT(f.id) AS total_flashcards
            FROM decks d

            INNER JOIN classes c
                ON d.class_id = c.id

            LEFT JOIN flashcards f
                ON d.id = f.deck_id

            WHERE d.class_id = :class_id

            GROUP BY d.id

            ORDER BY d.created_at DESC
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            ':class_id' => $classId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET ONE DECK
    public function getById(int $id): array|false
    {
        $sql = "
            SELECT
                d.*,
                c.name AS class_name,
                COUNT(f.id) AS total_flashcards
            FROM decks d

            INNER JOIN classes c
                ON d.class_id = c.id

            LEFT JOIN flashcards f
                ON d.id = f.deck_id

            WHERE d.id = :id

            GROUP BY d.id
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([':id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // UPDATE DECK
    public function update(
        int $id,
        int $classId,
        string $name,
        ?string $description = null
    ): bool {

        $name = trim($name);

        if ($name === '') {
            throw new InvalidArgumentException("Deck name is required.");
        }

        $sql = "
            UPDATE decks
            SET
                class_id = :class_id,
                name = :name,
                description = :description,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ";

        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute([
            ':class_id' => $classId,
            ':name' => $name,
            ':description' => $description,
            ':id' => $id
        ]);
    }

    // DELETE DECK
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM decks
            WHERE id = :id
        ");

        return $stmt->execute([':id' => $id]);
    }
}