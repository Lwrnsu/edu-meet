<?php
class Database {
    private static ?PDO $connection = null;

    public static function connect(): PDO {
        if (self::$connection === null) {
            try {
                $host = self::environmentValue("PHP_DB_HOST", "localhost");
                $database = self::environmentValue("PHP_DB_NAME", "EduMeet");
                $username = self::environmentValue("PHP_DB_USER", "root");
                $password = self::environmentValue("PHP_DB_PASSWORD", "secret");
                $dsn = "mysql:host=" . $host . ";dbname=" . $database . ";charset=utf8mb4";
                self::$connection = new PDO(
                    $dsn,
                    $username,
                    $password,
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

    private static function environmentValue(string $name, string $default): string {
        $value = getenv($name);
        return $value === false || $value === '' ? $default : $value;
    }
}