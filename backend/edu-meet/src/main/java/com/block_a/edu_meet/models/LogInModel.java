package com.block_a.edu_meet.models;

public class LogInModel {

    private int id;
    private String role;

    public LogInModel() {
    }

    public LogInModel(int id, String role) {
        this.id = id;
        this.role = role;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
