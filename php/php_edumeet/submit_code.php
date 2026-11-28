<?php 
require __DIR__.'/queries.php'; 
respond(submitCode($pdo, jsonBody()));
?>
