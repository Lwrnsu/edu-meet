package com.block_a.edu_meet;

import java.util.UUID;

public class Student {
    private final UUID id = UUID.randomUUID();
    private String username;
    private String name;

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
    public UUID getUUID(){
        return id;
    }
}