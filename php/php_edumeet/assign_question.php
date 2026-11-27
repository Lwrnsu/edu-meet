<?php 
require __DIR__.'/queries.php'; 
respond(assignQuestion($pdo, jsonBody()));
?>