<?php
declare(strict_types=1);

class Database {
    private static string $host = "localhost";
    private static string $database = "EduMeet";
    private static string $username = "root";
    private static string $password = "";
    private static ?PDO $connection = null;

    private function __construct() {}

    public static function connect(): PDO {
        if (self::$connection === null) {
            $dsn = "mysql:host=" . self::$host . ";dbname=" . self::$database . ";charset=utf8mb4";

            try {
                self::$connection = new PDO(
                    $dsn,
                    self::$username,
                    self::$password,
                    [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES   => false,
                    ]
                );
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw new RuntimeException("Could not connect to the database.", 0, $e);
            }
        }

        return self::$connection;
    }
}