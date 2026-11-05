<?php
$host = "127.0.0.1";
$user = "root";
$pass = "";
$dbname = "edu_meet_db";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Database Connection Failed: " . $conn->connect_error);
}
?>