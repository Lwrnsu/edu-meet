package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.fixtures.DummyClassFixture;
import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.service.CanonicalClassAccessService;
import com.block_a.edu_meet.service.MeetingAdmissionService;
import com.block_a.edu_meet.security.AuthenticatedUser;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomControllerTest {

    private static final int DUMMY_FACULTY_ID = DummyClassFixture.CLASS.facultyId();
    private static final int DUMMY_STUDENT_ID =
            DummyClassFixture.CLASS.blocks().get(0).studentIds().get(0);
    private static final int DUMMY_CLASS_ID = DummyClassFixture.CLASS.id();
    private static final int DUMMY_BLOCK_ID = DummyClassFixture.CLASS.blocks().get(0).id();
    private static final RoomTarget DUMMY_TARGET = new RoomTarget(
            DUMMY_CLASS_ID,
            DummyClassFixture.CLASS.subject(),
            DUMMY_BLOCK_ID,
            DummyClassFixture.CLASS.blocks().get(0).section(),
            DUMMY_FACULTY_ID,
            DummyClassFixture.CLASS.departmentId());

    @Mock
    private CanonicalClassAccessService classAccess;

    @Mock
    private MeetingAdmissionService admissionService;

    private RoomController controller;

    @BeforeEach
    void setUp() {
        controller = new RoomController(
                "test-api-key",
                "01234567890123456789012345678901",
                "wss://livekit.example.test",
                classAccess,
                admissionService);
    }

    @Test
    void tokenUsesAuthenticatedIdentityAndRoleInsteadOfRequestValues() {
        AuthenticatedUser user = new AuthenticatedUser(
                DUMMY_FACULTY_ID,
                "faculty",
                "faculty@example.test",
                "Trusted Faculty");
        Authentication authentication = authentication(user);
        when(classAccess.authorize(user, DUMMY_CLASS_ID, DUMMY_BLOCK_ID))
                .thenReturn(Optional.of(new AuthorizedRoom(DUMMY_TARGET, MeetingRole.FACULTY)));

        ResponseEntity<?> result = controller.getToken(
                new RoomController.RoomTokenRequest(DUMMY_CLASS_ID, DUMMY_BLOCK_ID),
                authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = assertInstanceOf(Map.class, result.getBody());
        assertEquals(Integer.toString(DUMMY_FACULTY_ID), body.get("identity"));
        assertEquals("Trusted Faculty", body.get("name"));
        assertEquals("FACULTY", body.get("role"));
        assertEquals("class-" + DUMMY_CLASS_ID + "-block-" + DUMMY_BLOCK_ID, body.get("roomName"));
        verify(classAccess).authorize(user, DUMMY_CLASS_ID, DUMMY_BLOCK_ID);
    }

    @Test
    void studentCannotEscalateToFacultyThroughRequestRole() {
        AuthenticatedUser user = new AuthenticatedUser(
                DUMMY_STUDENT_ID,
                "student",
                "student@example.test",
                "Trusted Student");
        Authentication authentication = authentication(user);
        when(classAccess.authorize(user, DUMMY_CLASS_ID, DUMMY_BLOCK_ID)).thenReturn(Optional.empty());

        ResponseEntity<?> result = controller.getToken(
                new RoomController.RoomTokenRequest(DUMMY_CLASS_ID, DUMMY_BLOCK_ID),
                authentication);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(classAccess).authorize(user, DUMMY_CLASS_ID, DUMMY_BLOCK_ID);
    }

    @Test
    void enrolledStudentCanCreateRoomAsFirstParticipantWithoutRoomAdminRights() throws Exception {
        AuthenticatedUser user = new AuthenticatedUser(
                DUMMY_STUDENT_ID,
                "student",
                "student@example.test",
                "Trusted Student");
        when(classAccess.authorize(user, DUMMY_CLASS_ID, DUMMY_BLOCK_ID))
                .thenReturn(Optional.of(new AuthorizedRoom(DUMMY_TARGET, MeetingRole.STUDENT)));

        ResponseEntity<?> result = controller.getToken(
                new RoomController.RoomTokenRequest(DUMMY_CLASS_ID, DUMMY_BLOCK_ID),
                authentication(user));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = assertInstanceOf(Map.class, result.getBody());
        String[] tokenParts = ((String) body.get("token")).split("\\.");
        JsonNode claims = new ObjectMapper().readTree(
                Base64.getUrlDecoder().decode(tokenParts[1]));
        assertTrue(claims.path("video").path("roomCreate").asBoolean());
        assertFalse(claims.path("video").path("roomAdmin").asBoolean());
    }

    @Test
    void approvedDummyOutsiderCanJoinWithoutFacultyAdminRights() throws Exception {
        AuthenticatedUser outsider = new AuthenticatedUser(
                94001,
                "student",
                "dummy-outsider@example.test",
                "DUMMY Outsider");
        when(classAccess.authorize(outsider, DUMMY_CLASS_ID, DUMMY_BLOCK_ID))
                .thenReturn(Optional.empty());
        when(admissionService.isApprovedFor(
                outsider, "dummy-approved-request", DUMMY_CLASS_ID, DUMMY_BLOCK_ID))
                .thenReturn(true);
        when(classAccess.findRoomTarget(DUMMY_CLASS_ID, DUMMY_BLOCK_ID))
                .thenReturn(Optional.of(DUMMY_TARGET));

        ResponseEntity<?> result = controller.getToken(
                new RoomController.RoomTokenRequest(
                        DUMMY_CLASS_ID, DUMMY_BLOCK_ID, "dummy-approved-request"),
                authentication(outsider));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = assertInstanceOf(Map.class, result.getBody());
        assertEquals("GUEST", body.get("role"));
        String[] tokenParts = ((String) body.get("token")).split("\\.");
        JsonNode claims = new ObjectMapper().readTree(
                Base64.getUrlDecoder().decode(tokenParts[1]));
        assertFalse(claims.path("video").path("roomAdmin").asBoolean());
    }

    private static Authentication authentication(AuthenticatedUser user) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}
