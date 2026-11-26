package com.block_a.edu_meet.models;

import java.util.Map;

public class LogInModel {

    private int id;
    private String role;
    // user info (email, names, school, ...) stored next to the role
    private Map<String, Object> user;

    public LogInModel() {
    }

    public LogInModel(int id, String role) {
        this.id = id;
        this.role = role;
    }

    public LogInModel(int id, String role, Map<String, Object> user) {
        this.id = id;
        this.role = role;
        this.user = user;
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

    public Map<String, Object> getUser() {
        return user;
    }

    public void setUser(Map<String, Object> user) {
        this.user = user;
    }
}
