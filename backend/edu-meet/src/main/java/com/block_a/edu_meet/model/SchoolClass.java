package com.block_a.edu_meet.model;

import java.util.List;
/**/
public class SchoolClass {
    private User facultyInCharge;   // Uses your User/Faculty role
    private List<Student> students; // Array/List of Student objects

    public SchoolClass(User facultyInCharge, List<Student> students) {
        this.facultyInCharge = facultyInCharge;
        this.students = students;
    }

    public User getFacultyInCharge() {
        return facultyInCharge;
    }

    public List<Student> getStudents() {
        return students;
    }
}