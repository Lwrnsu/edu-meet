<?php 
require __DIR__.'/queries.php'; 
respond(gradeSubmission($pdo, jsonBody()));
?>