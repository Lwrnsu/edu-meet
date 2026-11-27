<?php

class Database
{
    private static string $host = '127.0.0.1';
    private static string $database = 'edu_meet_db';
    private static string $username = 'root';
    private static string $password = '';
    private static ?PDO $connection = null;

    public static function connect(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        try {
            $dsn = 'mysql:host=' . self::$host . ';dbname=' . self::$database . ';charset=utf8mb4';
            self::$connection = new PDO(
                $dsn,
                self::$username,
                self::$password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
            self::$connection->exec("SET time_zone = '+08:00'");
        } catch (PDOException $e) {
            throw new RuntimeException('Database connection failed: ' . $e->getMessage());
        }

        return self::$connection;
    }
}
