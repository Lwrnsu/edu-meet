package com.block_a.edu_meet.models;

public class LogInRequest {
    private String email;
    private String password;

    public LogInRequest() {}

    public LogInRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
