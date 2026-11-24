<?php
/*
    SUBJECT TO CHANGE
    Maps the team's users table to the two roles the file management feature needs.
    Update the constants below if the users table uses different names or role values.
*/

require_once __DIR__ . '/../config/Database.php';

class ClassUser {
    const USERS_TABLE   = 'users';
    const ID_COLUMN     = 'id';
    const NAME_SQL      = '`name`';
    const ROLE_COLUMN   = 'role';
    const FACULTY_ROLES = ['faculty', 'teacher', 'instructor'];
    const STUDENT_ROLES = ['student'];

    private PDO $pdo;

    public function __construct() {
        $this->pdo = Database::connect();
    }

    // Subquery that returns (id, name, role) with role normalised to 'faculty' | 'student' | NULL.
    public static function table(): string {
        $in = fn(array $a) => implode(',', array_map(fn($v) => "'" . addslashes(strtolower($v)) . "'", $a));
        return '(SELECT `' . self::ID_COLUMN . '` AS id, ' . self::NAME_SQL . ' AS name, CASE'
            . ' WHEN LOWER(`' . self::ROLE_COLUMN . '`) IN (' . $in(self::FACULTY_ROLES) . ") THEN 'faculty'"
            . ' WHEN LOWER(`' . self::ROLE_COLUMN . '`) IN (' . $in(self::STUDENT_ROLES) . ") THEN 'student' END AS role"
            . ' FROM `' . self::USERS_TABLE . '`)';
    }

    public function find(int $id): ?array {
        $st = $this->pdo->prepare('SELECT * FROM ' . self::table() . ' u WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function firstWithRole(string $role): ?array {
        $st = $this->pdo->prepare('SELECT * FROM ' . self::table() . ' u WHERE role = ? ORDER BY id LIMIT 1');
        $st->execute([$role]);
        return $st->fetch() ?: null;
    }

    public function students(): array {
        return $this->pdo->query('SELECT * FROM ' . self::table() . " u WHERE role = 'student' ORDER BY name")->fetchAll();
    }
}
