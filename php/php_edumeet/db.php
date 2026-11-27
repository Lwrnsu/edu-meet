<?php
$host = "localhost";
$dbname = "db_compiler";
$user = "root";
$password = "";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname",
        $user,
        $password
    );

    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

} catch(PDOException $e) {
    die(json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]));
}
?>