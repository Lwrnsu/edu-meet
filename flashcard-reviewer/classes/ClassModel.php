
<?php

class ClassModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // CREATE CLASS
    public function create(string $name, ?string $description = null): int
    {
        $name = trim($name);

        if ($name === '') {
            throw new InvalidArgumentException("Class name is required.");
        }

        $sql = "
            INSERT INTO classes (name, description)
            VALUES (:name, :description)
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            ':name' => $name,
            ':description' => $description
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // GET ALL CLASSES
    public function getAll(): array
    {
        $sql = "
            SELECT
                c.*,
                COUNT(DISTINCT d.id) AS total_decks,
                COUNT(DISTINCT f.id) AS total_flashcards
            FROM classes c

            LEFT JOIN decks d
                ON c.id = d.class_id

            LEFT JOIN flashcards f
                ON d.id = f.deck_id

            GROUP BY c.id

            ORDER BY c.created_at DESC
        ";

        return $this->pdo
            ->query($sql)
            ->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET ONE CLASS
    public function getById(int $id): array|false
    {
        $sql = "
            SELECT
                c.*,
                COUNT(DISTINCT d.id) AS total_decks,
                COUNT(DISTINCT f.id) AS total_flashcards
            FROM classes c

            LEFT JOIN decks d
                ON c.id = d.class_id

            LEFT JOIN flashcards f
                ON d.id = f.deck_id

            WHERE c.id = :id

            GROUP BY c.id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // UPDATE CLASS
    public function update(
        int $id,
        string $name,
        ?string $description = null
    ): bool {

        $name = trim($name);

        if ($name === '') {
            throw new InvalidArgumentException("Class name is required.");
        }

        $sql = "
            UPDATE classes
            SET
                name = :name,
                description = :description,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ";

        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute([
            ':name' => $name,
            ':description' => $description,
            ':id' => $id
        ]);
    }

    // DELETE CLASS
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM classes
            WHERE id = :id
        ");

        return $stmt->execute([':id' => $id]);
    }
}