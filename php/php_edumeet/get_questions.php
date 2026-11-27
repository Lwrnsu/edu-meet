<?php 
require __DIR__.'/queries.php'; 
respond(getQuestions($pdo));
?>
