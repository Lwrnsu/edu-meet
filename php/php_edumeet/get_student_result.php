<?php 
require __DIR__.'/queries.php'; 
respond(getStudentResult($pdo, $_GET['studentName'] ?? ''));
?>