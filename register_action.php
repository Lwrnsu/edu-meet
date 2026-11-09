<?php
require_once "classes/Auth.php";
require_once "config/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: register.php");
    exit();
}

$first_name = trim($_POST["first_name"]);
$last_name  = trim($_POST["last_name"]);
$email      = trim($_POST["email"]);
$password   = $_POST["password"];
$confirm    = $_POST["confirm_password"];

if ($first_name === "" || $last_name === "") {
    header("Location: register.php?error=name"); exit();
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header("Location: register.php?error=email"); exit();
}
if (strlen($password) < 8) {
    header("Location: register.php?error=short"); exit();
}
if ($password !== $confirm) {
    header("Location: register.php?error=match"); exit();
}

$auth = new Auth();
if ($auth->getUserByEmail($email)) {
    header("Location: register.php?error=exists"); exit();
}

$hashed_password = password_hash($password, PASSWORD_BCRYPT);

$stmt = $conn->prepare(
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)"
);
$stmt->bind_param("ssss", $first_name, $last_name, $email, $hashed_password);

if ($stmt->execute()) {
    header("Location: login.php?success=1");
} else {
    header("Location: register.php?error=server");
}
$stmt->close();
$conn->close();
exit();
?>