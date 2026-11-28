<?php

class Database
{
    private static ?PDO $connection = null;
    private static ?mysqli $mysqliConnection = null;

    private static function setting(string $name, string $legacyName, string $default): string
    {
        foreach ([$name, $legacyName] as $settingName) {
            $value = getenv($settingName);
            if ($value !== false && $value !== '') {
                return $value;
            }
        }

        return $default;
    }

    public static function getConnection(): mysqli
    {
        if (self::$mysqliConnection === null) {
            self::$mysqliConnection = new mysqli(
                self::setting('EDUMEET_DB_HOST', 'PHP_DB_HOST', 'localhost'),
                self::setting('EDUMEET_DB_USER', 'PHP_DB_USER', 'root'),
                self::setting('EDUMEET_DB_PASSWORD', 'PHP_DB_PASSWORD', ''),
                self::setting('EDUMEET_DB_NAME', 'PHP_DB_NAME', 'EduMeet'),
                (int) self::setting('EDUMEET_DB_PORT', 'PHP_DB_PORT', '3306')
            );
            self::$mysqliConnection->set_charset('utf8mb4');
        }

        return self::$mysqliConnection;
    }

    public static function connect(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = self::setting('EDUMEET_DB_HOST', 'PHP_DB_HOST', 'localhost');
        $database = self::setting('EDUMEET_DB_NAME', 'PHP_DB_NAME', 'EduMeet');
        $port = self::setting('EDUMEET_DB_PORT', 'PHP_DB_PORT', '3306');
        $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";

        try {
            self::$connection = new PDO(
                $dsn,
                self::setting('EDUMEET_DB_USER', 'PHP_DB_USER', 'root'),
                self::setting('EDUMEET_DB_PASSWORD', 'PHP_DB_PASSWORD', ''),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
            self::$connection->exec("SET time_zone = '+08:00'");
        } catch (PDOException $exception) {
            throw new RuntimeException(
                'Database connection failed: ' . $exception->getMessage(),
                0,
                $exception
            );
        }

        return self::$connection;
    }
}
