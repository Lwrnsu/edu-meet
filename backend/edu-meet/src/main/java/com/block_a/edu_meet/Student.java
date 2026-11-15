package com.block_a.edu_meet;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "students")
public class Student {
    @Id
    private UUID id = UUID.randomUUID();
    private String username;
    private String name;

    public Student() {}

    public Student(String username, String name){
        this.username = username;
        this.name = name;
    }

    public String getUsername(){ return username; }
    public String getName(){ return name; }
    public UUID getID(){ return id; }
}