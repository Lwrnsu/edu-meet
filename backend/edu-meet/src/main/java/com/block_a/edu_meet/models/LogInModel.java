package com.block_a.edu_meet.models;

import java.util.Map;

public class LogInModel {

    public static final String PHP_SCHOOL = "php-school";

    private int id;
    private String source;
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

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Map<String, Object> getUser() {
        return user;
    }

    public void setUser(Map<String, Object> user) {
        this.user = user;
    }
}
