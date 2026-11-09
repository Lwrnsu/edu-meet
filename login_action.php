<?php
session_start();
require_once "classes/Auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: login.php");
    exit();
}

$email    = trim($_POST["email"]);
$password = $_POST["password"];

$auth = new Auth();
$user = $auth->getUserByEmail($email);

if (!$user || !$user["is_active"] || !password_verify($password, $user["password_hash"])) {
    header("Location: login.php?error=1");
    exit();
}

session_regenerate_id(true);
$_SESSION["user_id"]    = $user["user_id"];
$_SESSION["first_name"] = $user["first_name"];

header("Location: dashboard.php");
exit();
?>