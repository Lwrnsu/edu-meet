package com.block_a.edu_meet;

import java.util.UUID;

public class Meeting {
    private final UUID id = UUID.randomUUID();
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


        public static void main(String[] args){
        Student jay = new Student("Lwrnsu", "Jay");
        Student stranger = new Student("random", "Bob");

        Classroom classroom = new Classroom("Mr. Cruz", new Student[]{ jay });
        Meeting meeting = new Meeting(classroom);

        System.out.println(meeting.studentValidation(classroom, jay));
        System.out.println(meeting.studentValidation(classroom, stranger));

        System.out.println(meeting.facultyValidation(classroom, "Mr. Cruz"));
        System.out.println(meeting.facultyValidation(classroom, "Ms. Santos"));
        System.out.println(meeting.studentValidation(classroom, null));
        System.out.println(meeting.facultyValidation(null, "Mr. Cruz"));

        Classroom broken = new Classroom("Mr. Cruz", new Student[]{ null });
        //crashes if the entry in the array is null.
        System.out.println(meeting.studentValidation(broken, jay));
        System.out.println("\n");

        Classroom mixed = new Classroom("Mr. Cruz", new Student[]{ null, jay });
        System.out.println(meeting.studentValidation(mixed, jay));
    }
}

