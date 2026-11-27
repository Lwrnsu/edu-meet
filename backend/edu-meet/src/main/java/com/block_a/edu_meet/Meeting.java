package com.block_a.edu_meet;

import org.springframework.stereotype.Service;

import com.block_a.edu_meet.repository.ClassroomEnrollmentRepository;
import com.block_a.edu_meet.repository.ClassroomRepository;

@Service
public class Meeting {
    private final ClassroomRepository classroomRepository;
    private final ClassroomEnrollmentRepository enrollmentRepository;

    public Meeting(
            ClassroomRepository classroomRepository,
            ClassroomEnrollmentRepository enrollmentRepository) {
        this.classroomRepository = classroomRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public boolean facultyValidation(String roomName, String facultyUsername) {
        return hasText(roomName)
                && hasText(facultyUsername)
                && classroomRepository.existsByRoomNameAndFacultyInCharge(roomName, facultyUsername);
    }

    public boolean studentValidation(String roomName, String studentUsername) {
        return hasText(roomName)
                && hasText(studentUsername)
                && enrollmentRepository.existsByClassroom_RoomNameAndStudent_Username(roomName, studentUsername);
    }

    public boolean participantValidation(String roomName, String username) {
        return facultyValidation(roomName, username) || studentValidation(roomName, username);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
