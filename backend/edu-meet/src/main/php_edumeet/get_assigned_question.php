<?php
require 'db.php';

$stmt = $pdo->query("
SELECT
    q.id,
    q.question
FROM questions q
INNER JOIN assigned_question a
ON q.id = a.question_id
LIMIT 1
");

echo json_encode(
    $stmt->fetch(PDO::FETCH_ASSOC)
);
?>