package com.block_a.edu_meet.model;

public class Meeting {
    private SchoolClass schoolClass;

    public Meeting(SchoolClass schoolClass) {
        this.schoolClass = schoolClass;
    }

    // 1. Student Validation
    public boolean studentValidation(SchoolClass classObj, Student student) {
        if (classObj == null || student == null || classObj.getStudents() == null) {
            return false;
        }

        for (Student s : classObj.getStudents()) {
            if (s.getUsername().equals(student.getUsername())) {
                return true; // Student found in the class list
            }
        }
        return false;
    }

    // 2. Faculty Validation
    public boolean facultyValidation(SchoolClass classObj, User faculty) {
        if (classObj == null || faculty == null) {
            return false;
        }

        User assignedFaculty = classObj.getFacultyInCharge();
        if (assignedFaculty != null && assignedFaculty.getId().equals(faculty.getId())) {
            return true; // Correct assigned faculty
        }
        return false;
    }
}