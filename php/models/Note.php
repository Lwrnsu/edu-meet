<?php
namespace Notepad;

use PDO;
class Note

{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    // CREATE NOTE
    public function create(
        string $title = 'Untitled Note',
        ?string $content = null,
        string $category = 'General',
        ?int $classId = null
    ): int {

        $title = trim($title);
        $category = trim($category);

        if ($title === '') {
            $title = 'Untitled Note';
        }

        if ($category === '') {
            $category = 'General';
        }

        $sql = "
            INSERT INTO notes
                (title, content, category, class_id)
            VALUES
                (:title, :content, :category, :class_id)
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':category' => $category,
            ':class_id' => $classId
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // GET ALL NOTES
    public function getAll(): array
    {
        $sql = "
            SELECT
                notes.*,
                classes.name AS class_name
            FROM notes

            LEFT JOIN classes
                ON notes.class_id = classes.id

            ORDER BY
                notes.is_pinned DESC,
                notes.updated_at DESC
        ";

        return $this->pdo
            ->query($sql)
            ->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET ONE NOTE
    public function getById(int $id): array|false
    {
        $sql = "
            SELECT
                notes.*,
                classes.name AS class_name
            FROM notes

            LEFT JOIN classes
                ON notes.class_id = classes.id

            WHERE notes.id = :id
        ";

        $stmt = $this->pdo->prepare($sql);

        $stmt->execute([
            ':id' => $id
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // GET NOTES BY CATEGORY
    
public function getByCategory(string $category): array
{
    $stmt = $this->pdo->prepare("
        SELECT notes.*, classes.name AS class_name
        FROM notes
        LEFT JOIN classes ON notes.class_id = classes.id
        WHERE notes.category = :category
        ORDER BY notes.is_pinned DESC, notes.updated_at DESC
    ");

    $stmt->execute([
        ':category' => $category
    ]);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

    // SEARCH NOTES
   

public function search(string $keyword): array
{
    $stmt = $this->pdo->prepare("
        SELECT notes.*, classes.name AS class_name
        FROM notes
        LEFT JOIN classes ON notes.class_id = classes.id
        WHERE notes.title LIKE :title_keyword
           OR notes.content LIKE :content_keyword
        ORDER BY notes.is_pinned DESC, notes.updated_at DESC
    ");

    $searchKeyword = '%' . $keyword . '%';

    $stmt->execute([
        ':title_keyword' => $searchKeyword,
        ':content_keyword' => $searchKeyword
    ]);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}


    // UPDATE NOTE
    public function update(
        int $id,
        string $title,
        ?string $content,
        string $category,
        ?int $classId = null
    ): bool {

        $title = trim($title);
        $category = trim($category);

        if ($title === '') {
            $title = 'Untitled Note';
        }

        if ($category === '') {
            $category = 'General';
        }

        $stmt = $this->pdo->prepare("
            UPDATE notes
            SET
                title = :title,
                content = :content,
                category = :category,
                class_id = :class_id
            WHERE id = :id
        ");

        return $stmt->execute([
            ':id' => $id,
            ':title' => $title,
            ':content' => $content,
            ':category' => $category,
            ':class_id' => $classId
        ]);
    }

    // PIN OR UNPIN NOTE
    public function togglePin(int $id): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE notes
            SET is_pinned = NOT is_pinned
            WHERE id = :id
        ");

        return $stmt->execute([
            ':id' => $id
        ]);
    }

    // DELETE NOTE
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM notes
            WHERE id = :id
        ");

        return $stmt->execute([
            ':id' => $id
        ]);
    }

    // GET ALL CATEGORIES
    public function getCategories(): array
    {
        $stmt = $this->pdo->query("
            SELECT DISTINCT category
            FROM notes
            ORDER BY category ASC
        ");

        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    // CHECK IF CLASS EXISTS
    public function classExists(int $classId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*)
            FROM classes
            WHERE id = :class_id
        ");

        $stmt->execute([
            ':class_id' => $classId
        ]);

        return (int) $stmt->fetchColumn() > 0;
    }

}
