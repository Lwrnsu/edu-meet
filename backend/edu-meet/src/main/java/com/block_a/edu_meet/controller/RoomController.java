package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingAdmissionRequest;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.service.CanonicalClassAccessService;
import com.block_a.edu_meet.service.MeetingAdmissionService;
import com.block_a.edu_meet.security.AuthenticatedUser;
import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomAdmin;
import io.livekit.server.RoomCreate;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/room")
public class RoomController {

    private final String apiKey;
    private final String apiSecret;
    private final String livekitUrl;
    private final CanonicalClassAccessService classAccess;
    private final MeetingAdmissionService admissionService;

    public RoomController(
            @Value("${livekit.api-key}") String apiKey,
            @Value("${livekit.api-secret}") String apiSecret,
            @Value("${livekit.url:}") String livekitUrl,
            CanonicalClassAccessService classAccess,
            MeetingAdmissionService admissionService) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.livekitUrl = livekitUrl;
        this.classAccess = classAccess;
        this.admissionService = admissionService;
    }

    @GetMapping("/classes")
    public ResponseEntity<?> getClasses(Authentication authentication) {
        AuthenticatedUser user = requireAuthenticatedUser(authentication);
        return ResponseEntity.ok(classAccess.listRoomTargets(user));
    }

    @PostMapping("/admission-requests")
    public ResponseEntity<MeetingAdmissionRequest> requestAdmission(
            @RequestBody(required = false) RoomTokenRequest request,
            Authentication authentication) {
        AuthenticatedUser user = requireAuthenticatedUser(authentication);
        if (request == null || request.classId() == null || request.blockId() == null
                || request.classId() <= 0 || request.blockId() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Positive classId and blockId are required");
        }
        return ResponseEntity.accepted().body(
                admissionService.createRequest(user, request.classId(), request.blockId()));
    }

    @GetMapping("/admission-requests")
    public ResponseEntity<?> getPendingAdmissionRequests(Authentication authentication) {
        AuthenticatedUser user = requireAuthenticatedUser(authentication);
        return ResponseEntity.ok(admissionService.pendingRequestsForFaculty(user));
    }

    @GetMapping("/admission-requests/{requestId}")
    public ResponseEntity<MeetingAdmissionRequest> getAdmissionRequest(
            @PathVariable String requestId,
            Authentication authentication) {
        AuthenticatedUser user = requireAuthenticatedUser(authentication);
        return ResponseEntity.ok(admissionService.getRequestForRequester(user, requestId));
    }

    @PostMapping("/admission-requests/{requestId}/decision")
    public ResponseEntity<MeetingAdmissionRequest> decideAdmissionRequest(
            @PathVariable String requestId,
            @RequestBody(required = false) AdmissionDecisionRequest decision,
            Authentication authentication) {
        AuthenticatedUser user = requireAuthenticatedUser(authentication);
        if (decision == null || decision.approved() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "approved is required");
        }
        return ResponseEntity.ok(admissionService.decide(user, requestId, decision.approved()));
    }

    @PostMapping("/token")
    public ResponseEntity<?> getToken(
            @RequestBody(required = false) RoomTokenRequest params,
            Authentication authentication) {

        AuthenticatedUser user = requireAuthenticatedUser(authentication);
        Map<String, Object> response = new HashMap<>();

        if (params == null || params.classId() == null || params.blockId() == null
                || params.classId() <= 0 || params.blockId() <= 0) {
            response.put("error", "Positive classId and blockId are required");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<AuthorizedRoom> authorizedRoom = classAccess.authorize(user, params.classId(), params.blockId());
        RoomTarget target;
        MeetingRole role;
        if (authorizedRoom.isPresent()) {
            target = authorizedRoom.get().target();
            role = authorizedRoom.get().role();
        } else if (admissionService.isApprovedFor(
                user, params.admissionRequestId(), params.classId(), params.blockId())) {
            target = classAccess.findRoomTarget(params.classId(), params.blockId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Class section not found"));
            role = MeetingRole.GUEST;
        } else {
            response.put("error", "Access denied: authenticated user is not authorized for this class section");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        String roomName = target.roomName();
        String identity = Integer.toString(user.id());

        String displayName = user.displayName() == null || user.displayName().isBlank()
                ? identity
                : user.displayName();

        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setIdentity(identity);
        token.setName(displayName);
        token.addGrants(
                new RoomJoin(true),
                new RoomName(roomName),
                new RoomAdmin(role == MeetingRole.FACULTY || role == MeetingRole.DEAN),
                new RoomCreate(true),
                new CanPublish(true),
                new CanSubscribe(true)
        );

        response.put("token", token.toJwt());
        response.put("roomName", roomName);
        response.put("classId", target.classId());
        response.put("blockId", target.blockId());
        response.put("subject", target.subject());
        response.put("section", target.section());
        response.put("identity", identity);
        response.put("name", displayName);
        response.put("role", role.name());
        if (livekitUrl != null && !livekitUrl.isBlank()) {
            response.put("url", livekitUrl);
        }

        return ResponseEntity.ok(response);
    }

    private static AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "A verified authenticated user is required.");
        }
        return user;
    }

    public record RoomTokenRequest(Integer classId, Integer blockId, String admissionRequestId) {
        public RoomTokenRequest(Integer classId, Integer blockId) {
            this(classId, blockId, null);
        }
    }

    public record AdmissionDecisionRequest(Boolean approved) {
    }
}