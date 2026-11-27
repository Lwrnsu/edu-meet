import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.println("=== SIGN UP ===");
        System.out.print("First name: ");
        String firstName = sc.nextLine().trim();
        System.out.print("Last name: ");
        String lastName = sc.nextLine().trim();
        System.out.print("Username: ");
        String username = sc.nextLine().trim();
        System.out.print("Password: ");
        String password = sc.nextLine();
        System.out.print("Confirm password: ");
        String confirm = sc.nextLine();

        SignUp signUp = new SignUp();
        if (!signUp.signUp(firstName, lastName, username, password, confirm)) {
            return; // validation failed, error already printed
        }

        Authentication auth = new Authentication(1, username, password);

        System.out.println("\n=== LOG IN ===");
        System.out.print("Username: ");
        String loginUser = sc.nextLine().trim();
        System.out.print("Password: ");
        String loginPass = sc.nextLine();

        System.out.println(auth.logIn(loginUser, loginPass) ? "Login successful (true)" : "Login failed (false)");
    }
}