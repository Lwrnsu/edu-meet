<?php
session_start();
if (!isset($_SESSION["user_id"])) {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - EDU-MEET</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-body">
    <div class="login-card">
        <h1>Welcome, <?php echo htmlspecialchars($_SESSION["first_name"]); ?>!</h1>
        <p class="subtitle">You are signed in.</p>
        <p class="switch-auth"><a href="logout.php">Log out</a></p>
    </div>
</body>
</html>