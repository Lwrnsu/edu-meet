package com.block_a.edu_meet;

import java.util.UUID;

public class Classroom {
    private final UUID id = UUID.randomUUID();
    private String facultyInCharge;
    private Student[] student;
    
    public Classroom(String facultyInCharge, Student[] student){
        this.facultyInCharge = facultyInCharge;
        this.student = student;
    }

    public Student[] getStudent(){
        return student;
    }
    public UUID getUUIDfaculty(){
        return id;
    }
    public String getFacultyInCharge(){
        return facultyInCharge;
    }
}
