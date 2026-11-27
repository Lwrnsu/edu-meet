<?php 
require __DIR__.'/queries.php'; 
respond(deleteQuestion($pdo, jsonBody()));
?>