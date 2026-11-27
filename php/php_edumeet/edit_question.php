<?php 
require __DIR__.'/queries.php'; 
respond(editQuestion($pdo, jsonBody()));
?>