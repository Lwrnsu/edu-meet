<?php
require 'db.php';

$stmt = $pdo->query("
SELECT *
FROM submissions
ORDER BY
CASE
WHEN score IS NULL THEN 0
ELSE 1
END,
id DESC
");

echo json_encode(
    $stmt->fetchAll(PDO::FETCH_ASSOC)
);
?>