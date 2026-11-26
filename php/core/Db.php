<?php
require_once __DIR__ . '/../../config/Database.php';

/**
 * Thin wrapper around the team's Database class (config/Database.php).
 * If your Database class uses a different method name, change ONLY pdo() below.
 */
final class Db
{
    private static $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $database = new Database();
            // <-- adjust here if your class exposes the connection differently
            $pdo = method_exists($database, 'getConnection')
                ? $database->getConnection()
                : $database->connect();
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            self::$pdo = $pdo;
        }
        return self::$pdo;
    }

    /** Sub-select that normalises the users table to (id, name, role). */
    public static function users(): string
    {
        $in = function (array $a) {
            return implode(',', array_map(function ($v) {
                return "'" . addslashes(strtolower($v)) . "'";
            }, $a));
        };
        return '(SELECT `' . U_ID . '` AS id, ' . U_NAME_SQL . ' AS name, CASE'
            . ' WHEN LOWER(`' . U_ROLE . '`) IN (' . $in(FACULTY_ROLES) . ") THEN 'faculty'"
            . ' WHEN LOWER(`' . U_ROLE . '`) IN (' . $in(STUDENT_ROLES) . ") THEN 'student' END AS role"
            . ' FROM `' . USERS_TABLE . '`)';
    }

    public static function students(): array
    {
        return self::pdo()
            ->query('SELECT * FROM ' . self::users() . " u WHERE role = 'student' ORDER BY name")
            ->fetchAll();
    }
}
