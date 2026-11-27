<?php 
require __DIR__.'/queries.php'; 
respond(getSubmissions($pdo));
?>