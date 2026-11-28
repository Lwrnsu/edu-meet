package com.block_a.edu_meet.service;

import com.block_a.edu_meet.fixtures.DummyClassFixture;
import com.block_a.edu_meet.repository.PhpClassRepository;
import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.OptionalInt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CanonicalClassAccessServiceTest {

    private static final RoomTarget DUMMY_TARGET = new RoomTarget(
            DummyClassFixture.CLASS.id(),
            DummyClassFixture.CLASS.subject(),
            DummyClassFixture.CLASS.blocks().get(0).id(),
            DummyClassFixture.CLASS.blocks().get(0).section(),
            DummyClassFixture.CLASS.facultyId(),
            DummyClassFixture.CLASS.departmentId());

    @Mock
    private PhpClassRepository classRepository;

    private CanonicalClassAccessService service;

    @BeforeEach
    void setUp() {
        service = new CanonicalClassAccessService(classRepository);
    }

    @Test
    void authorizesStudentOnlyForTheirEnrolledClassBlock() {
        int studentId = DummyClassFixture.CLASS.blocks().get(0).studentIds().get(0);
        int classDatabaseUserId = studentId + 1000;
        AuthenticatedUser student = new AuthenticatedUser(
                studentId, "student", "dummy-student@example.test", "DUMMY Student");
        when(classRepository.findAccountIdByEmail(student.email()))
                .thenReturn(OptionalInt.of(classDatabaseUserId));
        when(classRepository.findRoomTarget(DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(Optional.of(DUMMY_TARGET));
        when(classRepository.isStudentEnrolled(
                classDatabaseUserId, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(true);

        Optional<AuthorizedRoom> access = service.authorize(
                student, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId());

        assertEquals(MeetingRole.STUDENT, access.orElseThrow().role());
        assertEquals(DUMMY_TARGET, access.orElseThrow().target());
        verify(classRepository).isStudentEnrolled(
                classDatabaseUserId, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId());
    }

    @Test
    void rejectsStudentNotEnrolledInRequestedBlock() {
        int studentId = DummyClassFixture.CLASS.blocks().get(0).studentIds().get(0);
        AuthenticatedUser student = new AuthenticatedUser(
                studentId, "student", "dummy-student@example.test", "DUMMY Student");
        when(classRepository.findRoomTarget(DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(Optional.of(DUMMY_TARGET));
        when(classRepository.isStudentEnrolled(studentId, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(false);

        assertTrue(service.authorize(student, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()).isEmpty());
    }

    @Test
    void authorizesAssignedFacultyAndDepartmentDean() {
        AuthenticatedUser faculty = new AuthenticatedUser(
                DummyClassFixture.CLASS.facultyId(), "faculty", "dummy-faculty@example.test", "DUMMY Faculty");
        AuthenticatedUser dean = new AuthenticatedUser(
                99001, "college_dean", "dummy-dean@example.test", "DUMMY Dean");
        when(classRepository.findRoomTarget(DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(Optional.of(DUMMY_TARGET));
        when(classRepository.findDeanDepartmentId(dean.id()))
                .thenReturn(OptionalInt.of(DUMMY_TARGET.departmentId()));

        assertEquals(
                MeetingRole.FACULTY,
                service.authorize(faculty, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId())
                        .orElseThrow().role());
        assertEquals(
                MeetingRole.DEAN,
                service.authorize(dean, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId())
                        .orElseThrow().role());
        verify(classRepository).findDeanDepartmentId(dean.id());
    }

    @Test
    void deniesDeanOutsideClassDepartment() {
        AuthenticatedUser dean = new AuthenticatedUser(
                99002, "college_dean", "other-dean@example.test", "DUMMY Other Dean");
        when(classRepository.findRoomTarget(DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(Optional.of(DUMMY_TARGET));
        when(classRepository.findDeanDepartmentId(dean.id()))
                .thenReturn(OptionalInt.of(DUMMY_TARGET.departmentId() + 1));

        assertTrue(service.authorize(dean, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()).isEmpty());
    }
}
