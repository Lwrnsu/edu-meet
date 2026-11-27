<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$pdo->query("DELETE FROM assigned_question");

$stmt = $pdo->prepare(
    "INSERT INTO assigned_question(question_id)
     VALUES(?)"
);

$stmt->execute([
    $data['questionId']
]);

echo json_encode([
    "success" => true
]);
?>