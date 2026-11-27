package com.block_a.edu_meet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", unique = true, length = 100)
    private String accountId;

    @Column(unique = true, length = 150)
    private String email;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    private String name;

    public Student() {}

    public Student(String username, String name) {
        this.username = username;
        this.name = name;
    }

    public Student(String accountId, String email, String username, String name) {
        this.accountId = accountId;
        this.email = email;
        this.username = username;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getAccountId() { return accountId; }
    public String getEmail() { return email; }
    public String getUsername() { return username; }
    public String getName() { return name; }

    public void setAccountId(String accountId) { this.accountId = accountId; }
    public void setEmail(String email) { this.email = email; }
    public void setUsername(String username) { this.username = username; }
    public void setName(String name) { this.name = name; }
}