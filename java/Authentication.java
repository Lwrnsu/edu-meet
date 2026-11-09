import org.mindrot.jbcrypt.BCrypt;

public class Authentication {
    private int id;
    private String username;
    private String password;

    public Authentication(int id, String username, String plainPassword) {
        this.id = id;
        this.username = username;
        setPassword(plainPassword);
    }

    public int getId() { return id; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }

    public void setId(int id) { this.id = id; }
    public void setUsername(String username) { this.username = username; }
    public void setPassword(String plainPassword) {
        this.password = BCrypt.hashpw(plainPassword, BCrypt.gensalt());
    }

    public boolean logIn(String username, String plainPassword) {
        if (!this.username.equals(username)) return false;
        return BCrypt.checkpw(plainPassword, this.password);
    }
}