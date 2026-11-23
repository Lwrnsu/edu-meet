<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$stmt = $pdo->prepare(
    "UPDATE questions
     SET question = ?
     WHERE id = ?"
);

$stmt->execute([
    $data['question'],
    $data['id']
]);

echo json_encode([
    "success" => true
]);
?>