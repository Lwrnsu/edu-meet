<?php

class Database
{
    private static ?mysqli $connection = null;

    public static function getConnection(): mysqli
    {
        if (self::$connection instanceof mysqli) {
            return self::$connection;
        }

        $host = '127.0.0.1';
        $user = 'root';
        $pass = '';
        $dbname = 'edu_meet_db';

        self::$connection = new mysqli($host, $user, $pass, $dbname);

        if (self::$connection->connect_error) {
            throw new RuntimeException('Database Connection Failed: ' . self::$connection->connect_error);
        }

        self::$connection->set_charset('utf8mb4');

        return self::$connection;
    }
}
