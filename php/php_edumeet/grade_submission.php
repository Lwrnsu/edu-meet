<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$stmt = $pdo->prepare("
UPDATE submissions
SET
    score = ?,
    comment = ?
WHERE id = ?
");

$stmt->execute([
    $data['score'],
    $data['comment'],
    $data['id']
]);

echo json_encode([
    "success" => true
]);
?>