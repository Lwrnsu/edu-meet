<?php 
require __DIR__.'/queries.php'; 
respond(saveQuestion($pdo, jsonBody()));
?>
