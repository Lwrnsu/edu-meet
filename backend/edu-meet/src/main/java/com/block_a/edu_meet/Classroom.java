package com.block_a.edu_meet;


public class Classroom {
    private String facultyInCharge;
    private Student[] student;
    
    public Classroom(String facultyInCharge, Student[] student){
        this.facultyInCharge = facultyInCharge;
        this.student = student;
    }

    public Student[] getStudent(){
        return student;
    }
    public String getFacultyInCharge(){
        return facultyInCharge;
    }
}
