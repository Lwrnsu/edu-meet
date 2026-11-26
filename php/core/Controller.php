<?php
abstract class Controller
{
    protected $pdo;
    protected $me;

    public function __construct()
    {
        $this->pdo = Db::pdo();
        $this->me  = Auth::user();
    }

    protected function isFaculty(): bool
    {
        return $this->me && $this->me['role'] === 'faculty';
    }

    protected function requireFaculty(): void
    {
        if (!$this->isFaculty()) Http::fail('Not allowed.', 403);
    }

    /** SELECT * FROM $table WHERE id = ? (table names are hard-coded by callers, never user input). */
    protected function find(string $table, int $id): ?array
    {
        $s = $this->pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
        $s->execute([$id]);
        return $s->fetch() ?: null;
    }
}
