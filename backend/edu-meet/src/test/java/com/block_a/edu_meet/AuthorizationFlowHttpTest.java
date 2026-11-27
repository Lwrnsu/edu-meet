package com.block_a.edu_meet;

import com.block_a.edu_meet.client.PhpApiClient;
import com.block_a.edu_meet.client.PhpLoginClient;
import com.block_a.edu_meet.controller.AuthController;
import com.block_a.edu_meet.controller.RoomController;
import com.block_a.edu_meet.fixtures.DummyClassFixture;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.repository.UserRepository;
import com.block_a.edu_meet.security.JwtAuthFilter;
import com.block_a.edu_meet.security.JwtService;
import com.block_a.edu_meet.security.SecurityConfig;
import com.block_a.edu_meet.service.AuthService;
import com.block_a.edu_meet.service.CanonicalClassAccessService;
import com.block_a.edu_meet.service.MeetingAdmissionService;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.mockito.MockedStatic;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = {AuthController.class, RoomController.class},
        properties = {
                "livekit.api-key=test-api-key",
                "livekit.api-secret=01234567890123456789012345678901",
                "livekit.url=wss://livekit.example.test"
        })
@Import({SecurityConfig.class, JwtAuthFilter.class})
class AuthorizationFlowHttpTest {

    private static final String SESSION_TOKEN = "opaque-redis-session-token";
    private static final int DUMMY_CLASS_ID = DummyClassFixture.CLASS.id();
    private static final int DUMMY_BLOCK_ID = DummyClassFixture.CLASS.blocks().get(0).id();
    private static final int DUMMY_FACULTY_ID = DummyClassFixture.CLASS.facultyId();
    private static final int DUMMY_STUDENT_ID =
            DummyClassFixture.CLASS.blocks().get(0).studentIds().get(0);
    private static final RoomTarget DUMMY_TARGET = new RoomTarget(
            DUMMY_CLASS_ID,
            DummyClassFixture.CLASS.subject(),
            DUMMY_BLOCK_ID,
            DummyClassFixture.CLASS.blocks().get(0).section(),
            DummyClassFixture.CLASS.facultyId(),
            DummyClassFixture.CLASS.departmentId());

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private PhpLoginClient phpLoginClient;

    @MockitoBean
    private PhpApiClient phpApiClient;

    @MockitoBean
    private CanonicalClassAccessService classAccess;

    @MockitoBean
    private MeetingAdmissionService admissionService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void phpLoginSessionAuthorizesMeetingTokenRequestOverHttp() throws Exception {
        JsonNode phpLoginResponse = objectMapper.readTree("""
                {
                  "user": {
                    "id": %d,
                    "role": "faculty",
                    "email": "faculty@example.test",
                    "full_name": "Trusted Faculty"
                  }
                }
                """.formatted(DUMMY_FACULTY_ID));
        when(phpLoginClient.schoolLogin("faculty@example.test", "password"))
                .thenReturn(ResponseEntity.ok(phpLoginResponse));
        when(classAccess.authorize(
                argThat(user -> user.id() == DUMMY_FACULTY_ID && "faculty".equals(user.normalizedRole())),
                eq(DUMMY_CLASS_ID),
                eq(DUMMY_BLOCK_ID)))
                .thenReturn(Optional.of(new AuthorizedRoom(DUMMY_TARGET, MeetingRole.FACULTY)));

        try (MockedStatic<com.block_a.edu_meet.services.AuthService> sessions = mockStatic(
                com.block_a.edu_meet.services.AuthService.class)) {
            sessions.when(() -> com.block_a.edu_meet.services.AuthService.createAuthToken(any(LogInModel.class)))
                    .thenReturn(SESSION_TOKEN);
            sessions.when(() -> com.block_a.edu_meet.services.AuthService.logIn(SESSION_TOKEN))
                    .thenReturn(new LogInModel(
                    DUMMY_FACULTY_ID,
                            "faculty",
                            Map.of(
                                    "email", "faculty@example.test",
                                    "full_name", "Trusted Faculty")));

            MvcResult loginResult = mockMvc.perform(post("/api/auth/php-school-login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email":"faculty@example.test","password":"password"}
                                    """))
                    .andExpect(status().isOk())
                    .andReturn();

            String authorization = loginResult.getResponse().getHeader(HttpHeaders.AUTHORIZATION);
            assertEquals("Bearer " + SESSION_TOKEN, authorization);
            sessions.verify(() -> com.block_a.edu_meet.services.AuthService.createAuthToken(
                    argThat(session -> session.getId() == DUMMY_FACULTY_ID
                            && "faculty".equals(session.getRole()))));

            MvcResult roomResult = mockMvc.perform(post("/api/room/token")
                            .header(HttpHeaders.AUTHORIZATION, authorization)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "classId": %d,
                                      "blockId": %d,
                                      "role": "STUDENT",
                                      "accountId": "someone-else",
                                      "participantName": "Impersonated User"
                                    }
                                    """.formatted(DUMMY_CLASS_ID, DUMMY_BLOCK_ID)))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode roomResponse = objectMapper.readTree(roomResult.getResponse().getContentAsString());
            assertEquals(Integer.toString(DUMMY_FACULTY_ID), roomResponse.path("identity").asText());
            assertEquals("Trusted Faculty", roomResponse.path("name").asText());
            assertEquals("FACULTY", roomResponse.path("role").asText());
            assertEquals(
                    "class-" + DUMMY_CLASS_ID + "-block-" + DUMMY_BLOCK_ID,
                    roomResponse.path("roomName").asText());
            assertFalse(roomResponse.path("token").asText().isBlank());
            sessions.verify(() -> com.block_a.edu_meet.services.AuthService.logIn(SESSION_TOKEN));
            verify(classAccess).authorize(
                    argThat(user -> user.id() == DUMMY_FACULTY_ID),
                    eq(DUMMY_CLASS_ID),
                    eq(DUMMY_BLOCK_ID));
        }
    }

    @Test
    void missingOrInvalidBearerTokenIsRejectedBeforeMembershipLookup() throws Exception {
        mockMvc.perform(post("/api/room/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"classId\":91001,\"blockId\":92001}"))
                .andExpect(status().isUnauthorized());

        try (MockedStatic<com.block_a.edu_meet.services.AuthService> sessions = mockStatic(
                com.block_a.edu_meet.services.AuthService.class)) {
            sessions.when(() -> com.block_a.edu_meet.services.AuthService.logIn("invalid-session-token"))
                    .thenReturn(null);
            when(jwtService.isTokenValid("invalid-session-token")).thenReturn(false);

            mockMvc.perform(post("/api/room/token")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-session-token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"classId\":91001,\"blockId\":92001}"))
                    .andExpect(status().isUnauthorized());
        }

        verifyNoInteractions(classAccess);
    }

    @Test
    void studentSessionCannotEscalateToFacultyThroughHttpRequest() throws Exception {
        try (MockedStatic<com.block_a.edu_meet.services.AuthService> sessions = mockStatic(
                com.block_a.edu_meet.services.AuthService.class)) {
            sessions.when(() -> com.block_a.edu_meet.services.AuthService.logIn("student-session-token"))
                    .thenReturn(new LogInModel(
                            DUMMY_STUDENT_ID,
                            "student",
                            Map.of("email", "student@example.test", "full_name", "Trusted Student")));
            when(classAccess.authorize(
                    argThat(user -> user.id() == DUMMY_STUDENT_ID && "student".equals(user.normalizedRole())),
                    eq(DUMMY_CLASS_ID),
                    eq(DUMMY_BLOCK_ID))).thenReturn(Optional.empty());

            mockMvc.perform(post("/api/room/token")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer student-session-token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "classId": %d,
                                      "blockId": %d,
                                      "role": "FACULTY",
                                      "accountId": "17",
                                      "participantName": "Impersonated Faculty"
                                    }
                                    """.formatted(DUMMY_CLASS_ID, DUMMY_BLOCK_ID)))
                    .andExpect(status().isForbidden());
        }

        verify(classAccess).authorize(
                argThat(user -> user.id() == DUMMY_STUDENT_ID),
                eq(DUMMY_CLASS_ID),
                eq(DUMMY_BLOCK_ID));
    }
}
