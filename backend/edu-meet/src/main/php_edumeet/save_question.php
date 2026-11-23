<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$stmt = $pdo->prepare(
    "INSERT INTO questions(question)
     VALUES(?)"
);

$stmt->execute([
    $data['question']
]);

echo json_encode([
    "success" => true
]);
?>