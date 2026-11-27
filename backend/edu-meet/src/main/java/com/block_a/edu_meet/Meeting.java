package com.block_a.edu_meet;


public class Meeting {
    private final Classroom classroom;

    public Meeting(Classroom classroom){
        this.classroom = classroom;
    }

    public boolean facultyValidation(Classroom classroom, String facultyInCharge){
        if(classroom == null || facultyInCharge == null){
            return false;
        }
        return classroom.getFacultyInCharge().equals(facultyInCharge);
    }
    public boolean studentValidation(Classroom classroom,Student student){
        if(classroom == null || student == null || classroom.getStudent() == null){
            return false;
        }
        for(Student s : classroom.getStudent()){
            if(s == null){
                continue;
            } 
            if (s.getUsername().equals(student.getUsername())){
                return true;
            }
        }
        return false;
    }
}

