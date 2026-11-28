<?php
class Database {
    private static string $host = "localhost";
    private static string $database = "EduMeet";
    private static string $username = "root";
    private static string $password = "secret";
    private static ?PDO $connection = null;

    public static function connect(): PDO {
        if (self::$connection === null) {
            try {
                $dsn = "mysql:host=" . self::$host . ";dbname=" . self::$database . ";charset=utf8mb4";
                self::$connection = new PDO(
                    $dsn,
                    self::$username,
                    self::$password,
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false
                    ]
                );
            } catch (PDOException $e) {
                throw new RuntimeException(
                    "Database connection failed: " . $e->getMessage()
                );

            }
        }
        return self::$connection;
    }
}