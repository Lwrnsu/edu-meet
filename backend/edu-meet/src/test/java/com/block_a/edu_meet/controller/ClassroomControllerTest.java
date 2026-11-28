package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.Classroom;
import com.block_a.edu_meet.repository.ClassroomEnrollmentRepository;
import com.block_a.edu_meet.repository.ClassroomRepository;
import com.block_a.edu_meet.repository.StudentRepository;
import com.block_a.edu_meet.security.AuthenticatedUser;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassroomControllerTest {

    @Mock
    private ClassroomRepository classroomRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ClassroomEnrollmentRepository enrollmentRepository;

    private ClassroomController controller;

    @BeforeEach
    void setUp() {
        controller = new ClassroomController(
                classroomRepository,
                studentRepository,
                enrollmentRepository);
    }

    @Test
    void facultyCannotCreateClassrooms() {
        Authentication authentication = authentication(
                new AuthenticatedUser(17, "faculty", "faculty@example.test", "Faculty"));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.createClassroom(
                        Map.of(
                                "roomName", "class-101",
                                "facultyAccountId", "17"),
                        authentication));

        assertEquals(403, error.getStatusCode().value());
        verifyNoInteractions(classroomRepository, studentRepository, enrollmentRepository);
    }

    @Test
    void facultyCannotEnrollStudentsInAnotherFacultyClassroom() {
        Authentication authentication = authentication(
                new AuthenticatedUser(17, "faculty", "faculty@example.test", "Faculty"));
        when(classroomRepository.findByRoomName("class-101"))
                .thenReturn(Optional.of(new Classroom(
                        "class-101",
                        "other-faculty",
                        "88",
                        "other@example.test")));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.enrollStudent(
                        "class-101",
                        Map.of("accountId", "student-1"),
                        authentication));

        assertEquals(403, error.getStatusCode().value());
        verify(classroomRepository).findByRoomName("class-101");
        verify(classroomRepository, never()).save(org.mockito.ArgumentMatchers.any(Classroom.class));
        verifyNoInteractions(studentRepository, enrollmentRepository);
    }

    @Test
    void studentsCannotListAllClassrooms() {
        Authentication authentication = authentication(
                new AuthenticatedUser(23, "student", "student@example.test", "Student"));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.listClassrooms(authentication));

        assertEquals(403, error.getStatusCode().value());
        verifyNoInteractions(classroomRepository, studentRepository, enrollmentRepository);
    }

    private static Authentication authentication(AuthenticatedUser user) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}
