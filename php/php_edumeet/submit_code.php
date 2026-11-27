<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$stmt = $pdo->prepare("
INSERT INTO submissions
(student_name, question_id, code)
VALUES (?, ?, ?)
");

$stmt->execute([
    $data['studentName'],
    $data['questionId'],
    $data['code']
]);

echo json_encode([
    "success" => true
]);
?>