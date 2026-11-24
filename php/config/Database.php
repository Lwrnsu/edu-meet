<?php

class Database {
    private static ?PDO $connection = null;

    public static function connect(): PDO {
        if (self::$connection === null) {
            $host = self::getEnvValue('DB_HOST', 'postgressql');
            $port = self::getEnvValue('DB_PORT', '5432');
            $database = self::getEnvValue('DB_NAME', 'edumeet');
            $username = self::getEnvValue('DB_USER', 'postgres');
            $password = self::getEnvValue('DB_PASSWORD', '');

            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s',
                $host,
                $port,
                $database
            );

            try {
                self::$connection = new PDO(
                    $dsn,
                    $username,
                    $password,
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );
            } catch (PDOException $e) {
                throw new RuntimeException(
                    'Database connection failed: ' . $e->getMessage(),
                    0,
                    $e
                );
            }
        }

        return self::$connection;
    }

    private static function getEnvValue(string $key, string $default): string {
        $value = getenv($key);
        if ($value !== false && $value !== '') {
            return $value;
        }

        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return (string) $_ENV[$key];
        }

        return $default;
    }
}