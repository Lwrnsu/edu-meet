package com.block_a.edu_meet.model;

public class Student {
    private String username;
    private String name;

    public Student(String username, String name) {
        this.username = username;
        this.name = name;
    }

    public String getUsername() {
        return username;
    }

    public String getName() {
        return name;
    }
}