<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - EDU-MEET</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-body">
    <div class="signup-card">
        <div class="auth-banner">
            <h2>Welcome to</h2>
            <div class="dots">...</div>
        </div>

        <div class="auth-form-container">
            <h1>Sign Up</h1>
            <p class="subtitle">Create an account to access the app</p>

            <form action="register_action.php" method="POST" class="signup-grid">
                <div class="input-group">
                    <input type="text" name="first_name" placeholder="First Name" required>
                </div>
                <div class="input-group">
                    <input type="text" name="last_name" placeholder="Last Name" required>
                </div>
                <div class="input-group">
                    <input type="email" name="email" placeholder="Email ID" required>
                </div>
                <div class="input-group">
                    <div class="select-wrapper">
                        <select name="gender" required>
                            <option value="" disabled selected>Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                        <svg class="select-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                    </div>
                </div>
                <div class="input-group phone-group">
                    <span class="prefix">+63</span>
                    <input type="tel" name="phone" placeholder="Phone Number" required>
                </div>
                <div class="input-group">
                    <div class="date-wrapper">
                        <input type="text" name="dob" placeholder="Date of Birth" onfocus="(this.type='date')" onblur="(this.type='text')" required>
                        <svg class="calendar-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                    </div>
                </div>
                <div class="input-group icon-input">
                    <input type="password" name="password" placeholder="Password" required>
                    <svg class="eye-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </div>
                <div class="input-group icon-input">
                    <input type="password" name="confirm_password" placeholder="Confirm Password" required>
                    <svg class="eye-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </div>

                <div class="terms-group">
                    <input type="checkbox" id="terms" name="terms" required>
                    <label for="terms">I read and agree with <a href="#">Terms of Service</a> and our <a href="#">Privacy Policy</a></label>
                </div>

                <button type="submit" class="btn-primary">SIGN UP</button>
            </form>

            <p class="switch-auth">Already have an account? <a href="login.php">Sign In</a></p>
        </div>
    </div>
</body>
</html>