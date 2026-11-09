<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - EDU-MEET</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-body">
    <div class="login-card">
        <h1>Welcome Back</h1>
        <p class="subtitle">Sign in to your account to continue</p>

        <?php if (isset($_GET["error"])): ?>
            <p style="color:#c0392b; font-size:0.82rem; margin-bottom:16px;">Invalid email or password.</p>
        <?php endif; ?>
        <?php if (isset($_GET["success"])): ?>
            <p style="color:#27ae60; font-size:0.82rem; margin-bottom:16px;">Account created! Please sign in.</p>
        <?php endif; ?>

        <form action="login_action.php" method="POST" class="login-form">
            <div class="input-group">
                <label for="email">Email</label>
                <div class="input-wrapper">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                    <input type="email" id="email" name="email" placeholder="Email@gmail.com" required>
                </div>
            </div>

            <div class="input-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>
            </div>

            <div class="login-options">
                <div class="remember-me">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">Remember me</label>
                </div>
                <a href="forgot_password.php" class="forgot-link">Forgot Password?</a>
            </div>

            <button type="submit" class="btn-primary">SIGN IN</button>
        </form>

        <p class="switch-auth">Don't have an account? <a href="register.php">Sign Up</a></p>
    </div>
</body>
</html>