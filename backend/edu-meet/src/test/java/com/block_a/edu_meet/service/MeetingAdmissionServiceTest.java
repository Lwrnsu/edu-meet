package com.block_a.edu_meet.service;

import com.block_a.edu_meet.fixtures.DummyClassFixture;
import com.block_a.edu_meet.room.AdmissionRequestStatus;
import com.block_a.edu_meet.room.MeetingAdmissionRequest;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingAdmissionServiceTest {

    private static final RoomTarget DUMMY_TARGET = new RoomTarget(
            DummyClassFixture.CLASS.id(),
            DummyClassFixture.CLASS.subject(),
            DummyClassFixture.CLASS.blocks().get(0).id(),
            DummyClassFixture.CLASS.blocks().get(0).section(),
            DummyClassFixture.CLASS.facultyId(),
            DummyClassFixture.CLASS.departmentId());

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> values;

    @Mock
    private SetOperations<String, String> sets;

    @Mock
    private CanonicalClassAccessService classAccess;

    @Mock
    private LiveKitPresenceService liveKitPresence;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MeetingAdmissionService service;

    @BeforeEach
    void setUp() {
        when(redis.opsForValue()).thenReturn(values);
        service = new MeetingAdmissionService(redis, objectMapper, classAccess, liveKitPresence);
    }

    @Test
    void queuesDummyOutsiderRequestWhenAssignedFacultyIsNotPresent() throws Exception {
        when(redis.opsForSet()).thenReturn(sets);
        AuthenticatedUser outsider = new AuthenticatedUser(
                94001, "student", "dummy-outsider@example.test", "DUMMY Outsider");
        when(classAccess.findRoomTarget(DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(Optional.of(DUMMY_TARGET));
        when(classAccess.authorize(outsider, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()))
                .thenReturn(Optional.empty());
        when(liveKitPresence.isParticipantPresent(
                DUMMY_TARGET.roomName(), Integer.toString(DUMMY_TARGET.facultyId())))
                .thenReturn(false);

        MeetingAdmissionRequest request = service.createRequest(
                outsider, DUMMY_TARGET.classId(), DUMMY_TARGET.blockId());

        assertEquals(AdmissionRequestStatus.PENDING, request.status());
        assertFalse(request.facultyPresent());
        assertEquals(outsider.id(), request.requesterId());
        ArgumentCaptor<String> savedJson = ArgumentCaptor.forClass(String.class);
        verify(values).set(
                eq("meeting:admission:request:" + request.requestId()),
                savedJson.capture(),
                eq(Duration.ofHours(2)));
        MeetingAdmissionRequest savedRequest =
                objectMapper.readValue(savedJson.getValue(), MeetingAdmissionRequest.class);
        assertEquals(DUMMY_TARGET.classId(), savedRequest.classId());
        assertEquals(DUMMY_TARGET.blockId(), savedRequest.blockId());
        verify(sets).add(eq("meeting:admission:room:" + DUMMY_TARGET.roomName()), eq(request.requestId()));
    }

    @Test
    void approvedAdmissionAppliesOnlyToTheSameRequesterAndClassSection() throws Exception {
        int outsiderId = 94001;
        AuthenticatedUser outsider = new AuthenticatedUser(
                outsiderId, "student", "dummy-outsider@example.test", "DUMMY Outsider");
        MeetingAdmissionRequest approved = new MeetingAdmissionRequest(
                "dummy-approved-request",
                DUMMY_TARGET.classId(),
                DUMMY_TARGET.blockId(),
                outsiderId,
                "DUMMY Outsider",
                AdmissionRequestStatus.APPROVED,
                java.time.Instant.parse("2026-11-27T00:00:00Z"),
                true);
        when(values.get("meeting:admission:request:" + approved.requestId()))
                .thenReturn(objectMapper.writeValueAsString(approved));

        assertTrue(service.isApprovedFor(
                outsider, approved.requestId(), DUMMY_TARGET.classId(), DUMMY_TARGET.blockId()));
        assertFalse(service.isApprovedFor(
                new AuthenticatedUser(outsiderId + 1, "student", null, "DUMMY Other"),
                approved.requestId(),
                DUMMY_TARGET.classId(),
                DUMMY_TARGET.blockId()));
        assertFalse(service.isApprovedFor(
                outsider,
                approved.requestId(),
                DUMMY_TARGET.classId() + 1,
                DUMMY_TARGET.blockId()));
        verify(values, never()).set(anyString(), anyString(), eq(Duration.ofHours(2)));
    }

    @Test
    void onlyTheAssignedFacultyCanApproveAnAdmissionRequest() throws Exception {
        MeetingAdmissionRequest pending = new MeetingAdmissionRequest(
                "dummy-pending-request",
                DUMMY_TARGET.classId(),
                DUMMY_TARGET.blockId(),
                94001,
                "DUMMY Outsider",
                AdmissionRequestStatus.PENDING,
                java.time.Instant.parse("2026-11-27T00:00:00Z"),
                false);
        when(values.get("meeting:admission:request:" + pending.requestId()))
                .thenReturn(objectMapper.writeValueAsString(pending));
        AuthenticatedUser wrongFaculty = new AuthenticatedUser(
                DUMMY_TARGET.facultyId() + 1,
                "faculty",
                "other-faculty@example.test",
                "DUMMY Other Faculty");
        when(classAccess.isAssignedFaculty(
                wrongFaculty, pending.classId(), pending.blockId())).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.decide(wrongFaculty, pending.requestId(), true));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verify(values, never()).set(anyString(), anyString(), eq(Duration.ofHours(2)));
    }
}
