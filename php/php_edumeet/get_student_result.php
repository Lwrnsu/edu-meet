<?php
require 'db.php';

$studentName = $_GET['studentName'];

$stmt = $pdo->prepare("
SELECT *
FROM submissions
WHERE student_name = ?
ORDER BY id DESC
");

$stmt->execute([
    $studentName
]);

echo json_encode(
    $stmt->fetchAll(PDO::FETCH_ASSOC)
);
?>