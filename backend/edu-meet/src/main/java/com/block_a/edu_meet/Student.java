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

    @Column(nullable = false, unique = true, length = 100)
    private String username;
    private String name;

    public Student() {}

    public Student(String username, String name){
        this.username = username;
        this.name = name;
    }

    public String getUsername(){
        return username;
    }
    public String getName(){
        return name;
    }

    public Long getId() {
        return id;
    }
}