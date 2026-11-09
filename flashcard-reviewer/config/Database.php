
<?php

class Database
{
    private string $host = "localhost";
    private string $database = "flashcard_reviewer";
    private string $username = "root";
    private string $password = "";

    private ?PDO $connection = null;

    public function connect(): PDO
    {
        if ($this->connection === null) {

            try {

                $dsn = "mysql:host={$this->host};dbname={$this->database};charset=utf8mb4";

                $this->connection = new PDO(
                    $dsn,
                    $this->username,
                    $this->password,
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

        return $this->connection;
    }
}
