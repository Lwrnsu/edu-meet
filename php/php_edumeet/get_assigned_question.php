<?php 
require __DIR__.'/queries.php'; 
respond(getAssignedQuestion($pdo));
?>