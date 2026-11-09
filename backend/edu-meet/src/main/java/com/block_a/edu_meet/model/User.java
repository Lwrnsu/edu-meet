package com.block_a.edu_meet.model;

public class User {
    private Long id;
    private String name;
    private Role role; // Uses your new Role enum

    public User(Long id, String name, Role role) {
        this.id = id;
        this.name = name;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Role getRole() {
        return role;
    }
}