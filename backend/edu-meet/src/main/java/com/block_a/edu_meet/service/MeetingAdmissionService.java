package com.block_a.edu_meet.service;

import com.block_a.edu_meet.room.AdmissionRequestStatus;
import com.block_a.edu_meet.room.MeetingAdmissionRequest;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.security.AuthenticatedUser;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public class MeetingAdmissionService {

    private static final Duration REQUEST_TTL = Duration.ofHours(2);
    private static final String REQUEST_PREFIX = "meeting:admission:request:";
    private static final String ROOM_INDEX_PREFIX = "meeting:admission:room:";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final CanonicalClassAccessService classAccess;
    private final LiveKitPresenceService liveKitPresence;

    public MeetingAdmissionService(
            StringRedisTemplate redis,
            ObjectMapper objectMapper,
            CanonicalClassAccessService classAccess,
            LiveKitPresenceService liveKitPresence) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.classAccess = classAccess;
        this.liveKitPresence = liveKitPresence;
    }

    public MeetingAdmissionRequest createRequest(AuthenticatedUser requester, int classId, int blockId) {
        RoomTarget target = classAccess.findRoomTarget(classId, blockId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class section not found"));
        if (classAccess.authorize(requester, classId, blockId).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "You are already authorized for this class section");
        }

        boolean facultyPresent = liveKitPresence.isParticipantPresent(
                target.roomName(), Integer.toString(target.facultyId()));
        MeetingAdmissionRequest request = new MeetingAdmissionRequest(
                UUID.randomUUID().toString(),
                classId,
                blockId,
                requester.id(),
                requester.displayName(),
                AdmissionRequestStatus.PENDING,
                Instant.now(),
                facultyPresent);
        saveRequest(request);
        addToRoomIndex(target.roomName(), request.requestId());
        return request;
    }

    public List<MeetingAdmissionRequest> pendingRequestsForFaculty(AuthenticatedUser faculty) {
        if (!faculty.hasAnyRole("faculty", "professor")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only faculty can review admission requests");
        }

        List<MeetingAdmissionRequest> pending = new ArrayList<>();
        for (RoomTarget target : classAccess.listRoomTargets(faculty)) {
            if (!classAccess.isAssignedFaculty(faculty, target.classId(), target.blockId())) {
                continue;
            }
            Set<String> requestIds = redisCall(
                    () -> redis.opsForSet().members(roomIndexKey(target.roomName())));
            if (requestIds == null) {
                continue;
            }
            for (String requestId : requestIds) {
                MeetingAdmissionRequest request = findRequest(requestId);
                if (request == null) {
                    redisCall(() -> redis.opsForSet().remove(roomIndexKey(target.roomName()), requestId));
                } else if (request.status() == AdmissionRequestStatus.PENDING) {
                    pending.add(request);
                }
            }
        }
        return pending.stream()
                .sorted(Comparator.comparing(MeetingAdmissionRequest::createdAt))
                .toList();
    }

    public MeetingAdmissionRequest getRequestForRequester(AuthenticatedUser requester, String requestId) {
        MeetingAdmissionRequest request = requireRequest(requestId);
        if (request.requesterId() != requester.id()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admission request belongs to another user");
        }
        return request;
    }

    public MeetingAdmissionRequest decide(
            AuthenticatedUser faculty,
            String requestId,
            boolean approved) {
        MeetingAdmissionRequest request = requireRequest(requestId);
        if (!classAccess.isAssignedFaculty(faculty, request.classId(), request.blockId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the assigned faculty member can decide this request");
        }
        if (request.status() != AdmissionRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Admission request has already been decided");
        }

        MeetingAdmissionRequest decided = new MeetingAdmissionRequest(
                request.requestId(),
                request.classId(),
                request.blockId(),
                request.requesterId(),
                request.requesterName(),
                approved ? AdmissionRequestStatus.APPROVED : AdmissionRequestStatus.DENIED,
                request.createdAt(),
                request.facultyPresent());
        saveRequest(decided);
        return decided;
    }

    public boolean isApprovedFor(
            AuthenticatedUser requester,
            String requestId,
            int classId,
            int blockId) {
        MeetingAdmissionRequest request = findRequest(requestId);
        return request != null
                && request.requesterId() == requester.id()
                && request.classId() == classId
                && request.blockId() == blockId
                && request.status() == AdmissionRequestStatus.APPROVED;
    }

    private MeetingAdmissionRequest requireRequest(String requestId) {
        MeetingAdmissionRequest request = findRequest(requestId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Admission request not found or expired");
        }
        return request;
    }

    private MeetingAdmissionRequest findRequest(String requestId) {
        if (requestId == null || requestId.isBlank()) {
            return null;
        }
        String json = redisCall(() -> redis.opsForValue().get(REQUEST_PREFIX + requestId));
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, MeetingAdmissionRequest.class);
        } catch (JacksonException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not read the meeting admission request");
        }
    }

    private void saveRequest(MeetingAdmissionRequest request) {
        String json;
        try {
            json = objectMapper.writeValueAsString(request);
        } catch (JacksonException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not save the meeting admission request");
        }
        redisCall(() -> {
            redis.opsForValue().set(REQUEST_PREFIX + request.requestId(), json, REQUEST_TTL);
            return null;
        });
    }

    private void addToRoomIndex(String roomName, String requestId) {
        String key = roomIndexKey(roomName);
        redisCall(() -> redis.opsForSet().add(key, requestId));
        redisCall(() -> redis.expire(key, REQUEST_TTL));
    }

    private static String roomIndexKey(String roomName) {
        return ROOM_INDEX_PREFIX + roomName;
    }

    private <T> T redisCall(Supplier<T> operation) {
        try {
            return operation.get();
        } catch (DataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Meeting admission service is unavailable");
        }
    }
}
