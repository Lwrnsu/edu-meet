package com.block_a.edu_meet;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.block_a.edu_meet.repository.ClassroomEnrollmentRepository;
import com.block_a.edu_meet.repository.ClassroomRepository;

class MeetingTest {
    private final ClassroomRepository classroomRepository = mock(ClassroomRepository.class);
    private final ClassroomEnrollmentRepository enrollmentRepository =
            mock(ClassroomEnrollmentRepository.class);
    private final Meeting meeting = new Meeting(classroomRepository, enrollmentRepository);

    @Test
    void allowsOnlyEnrolledStudentsOrAssignedFaculty() {
        when(enrollmentRepository.existsByClassroom_RoomNameAndStudent_Username("room-a", "student-1"))
                .thenReturn(true);
        when(classroomRepository.existsByRoomNameAndFacultyInCharge("room-a", "teacher-1"))
                .thenReturn(true);

        assertTrue(meeting.studentValidation("room-a", "student-1"));
        assertTrue(meeting.facultyValidation("room-a", "teacher-1"));
        assertFalse(meeting.participantValidation("room-a", "unknown"));

        verify(enrollmentRepository)
                .existsByClassroom_RoomNameAndStudent_Username("room-a", "student-1");
    }

    @Test
    void rejectsBlankIdentifiersWithoutQueryingRepositories() {
        assertFalse(meeting.studentValidation("room-a", " "));
        assertFalse(meeting.facultyValidation(null, "teacher-1"));

        verifyNoInteractions(classroomRepository, enrollmentRepository);
    }
}
