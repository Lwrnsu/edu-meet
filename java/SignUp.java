import org.mindrot.jbcrypt.BCrypt;

public class SignUp {

    public boolean signUp(String firstName, String lastName, String username,
                          String password, String confirmPassword) {

        // Validation
        if (firstName.isEmpty() || lastName.isEmpty()) {
            System.out.println("Error: First and last name are required.");
            return false;
        }
        if (username.length() < 4) {
            System.out.println("Error: Username must be at least 4 characters.");
            return false;
        }
        if (password.length() < 8) {
            System.out.println("Error: Password must be at least 8 characters.");
            return false;
        }
        if (!password.equals(confirmPassword)) {
            System.out.println("Error: Passwords do not match.");
            return false;
        }

        // Hash with BCrypt
        String hashed = BCrypt.hashpw(password, BCrypt.gensalt());

        // Print the output
        System.out.println("=== Sign Up Successful ===");
        System.out.println("First Name: " + firstName);
        System.out.println("Last Name : " + lastName);
        System.out.println("Username  : " + username);
        System.out.println("Password  : " + hashed);
        return true;
    }
}