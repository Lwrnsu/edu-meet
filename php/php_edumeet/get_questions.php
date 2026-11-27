<?php
require 'db.php';

$stmt = $pdo->query(
    "SELECT * FROM questions ORDER BY id DESC"
);

echo json_encode(
    $stmt->fetchAll(PDO::FETCH_ASSOC)
);
?>