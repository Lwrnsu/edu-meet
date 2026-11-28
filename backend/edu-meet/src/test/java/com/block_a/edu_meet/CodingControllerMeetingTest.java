package com.block_a.edu_meet;

import com.block_a.edu_meet.controller.CodingController;
import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.security.AuthenticatedUser;
import com.block_a.edu_meet.service.CanonicalClassAccessService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CodingControllerMeetingTest {

    private static final int CLASS_ID = 1001;
    private static final int BLOCK_ID = 2001;

    private CanonicalClassAccessService classAccess;
    private CodingController controller;

    @BeforeEach
    void setUp() {
        classAccess = mock(CanonicalClassAccessService.class);
        controller = new CodingController(classAccess, "http://127.0.0.1:9/php_edumeet/");
    }

    @Test
    void codeRunRequiresClassMembership() {
        AuthenticatedUser student = new AuthenticatedUser(7, "student", "student@example.test", "Test Student");
        when(classAccess.authorize(student, CLASS_ID, BLOCK_ID)).thenReturn(Optional.empty());
        var authentication = new UsernamePasswordAuthenticationToken(student, null, List.of());

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.runMeetingCode(
                        new CodingController.MeetingCodeRunRequest(CLASS_ID, BLOCK_ID, "java", "class Main {}"),
                        authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(classAccess).authorize(student, CLASS_ID, BLOCK_ID);
    }

    @Test
    void facultyCannotSubmitStudentCode() {
        AuthenticatedUser faculty = new AuthenticatedUser(9, "faculty", "faculty@example.test", "Test Faculty");
        when(classAccess.authorize(faculty, CLASS_ID, BLOCK_ID))
                .thenReturn(Optional.of(new AuthorizedRoom(
                        new RoomTarget(CLASS_ID, "Test Class", BLOCK_ID, "A", faculty.id(), 3),
                        MeetingRole.FACULTY)));
        var authentication = new UsernamePasswordAuthenticationToken(faculty, null, List.of());

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.submitMeetingCode(
                        new CodingController.MeetingCodeSubmissionRequest(CLASS_ID, BLOCK_ID, 1, "class Main {}"),
                        authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(classAccess).authorize(faculty, CLASS_ID, BLOCK_ID);
    }
}
