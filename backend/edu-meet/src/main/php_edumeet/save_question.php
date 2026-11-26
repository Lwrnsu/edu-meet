<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$stmt = $pdo->prepare(
    "INSERT INTO questions(question, expected_output)
     VALUES(?, ?)"
);

$stmt->execute([
    $data['question'],
    $data['expectedOutput']
]);

echo json_encode([
    "success" => true
]);
?>