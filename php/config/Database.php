<<<<<<< HEAD
<?php
class Database {
    private static string $host = "localhost";
    private static string $database = "edu_meet_db";
    private static string $username = "root";
    private static string $password = "";
=======
﻿<?php

class Database
{
    private static string $host = '127.0.0.1';
    private static string $database = 'edu_meet_db';
    private static string $username = 'root';
    private static string $password = '';
>>>>>>> origin/CERICO
    private static ?PDO $connection = null;
    private static ?mysqli $mysqliConnection = null;

    private static function setting(string $name, string $default): string {
        $value = getenv($name);
        return $value === false ? $default : $value;
    }

    public static function getConnection(): mysqli {
        if (self::$mysqliConnection === null) {
            self::$mysqliConnection = new mysqli(
                self::setting('EDUMEET_DB_HOST', self::$host),
                self::setting('EDUMEET_DB_USER', self::$username),
                self::setting('EDUMEET_DB_PASSWORD', self::$password),
                self::setting('EDUMEET_DB_NAME', self::$database),
                (int) self::setting('EDUMEET_DB_PORT', '3306')
            );
            self::$mysqliConnection->set_charset('utf8mb4');
        }
        return self::$mysqliConnection;
    }

<<<<<<< HEAD
    public static function connect(): PDO {
        if (self::$connection === null) {
            try {
                $dsn = "mysql:host=" . self::setting('EDUMEET_DB_HOST', self::$host)
                    . ";port=" . self::setting('EDUMEET_DB_PORT', '3306')
                    . ";dbname=" . self::setting('EDUMEET_DB_NAME', self::$database) . ";charset=utf8mb4";
                self::$connection = new PDO(
                    $dsn,
                    self::setting('EDUMEET_DB_USER', self::$username),
                    self::setting('EDUMEET_DB_PASSWORD', self::$password),
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
=======
    public static function connect(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
>>>>>>> origin/CERICO
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