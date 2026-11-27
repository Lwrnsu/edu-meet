package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.Meeting;
import com.block_a.edu_meet.dtos.MemberDto;
import com.block_a.edu_meet.helpers.MemberLookup;
import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomAdmin;
import io.livekit.server.RoomCreate;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/room")
@CrossOrigin(origins = "*")
public class RoomController {

    private final String apiKey;
    private final String apiSecret;
    private final String livekitUrl;
    private final Meeting meeting;
    private final MemberLookup memberLookup;

    public RoomController(
            @Value("${livekit.api-key}") String apiKey,
            @Value("${livekit.api-secret}") String apiSecret,
            @Value("${livekit.url:}") String livekitUrl,
            Meeting meeting,
            MemberLookup memberLookup) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.livekitUrl = livekitUrl;
        this.meeting = meeting;
        this.memberLookup = memberLookup;
    }

    @PostMapping("/token")
    public ResponseEntity<?> getToken(
            @RequestHeader(value = "X-Account-Id", required = false) String headerAccountId,
            @RequestBody Map<String, String> params) {

        String roomName = params.get("roomName");
        String identifier = firstNonBlank(
                headerAccountId,
                params.get("accountId"),
                params.get("email"),
                params.get("participantName")
        );
        String requestedRole = params.getOrDefault("role", "").trim().toUpperCase();

        Map<String, Object> response = new HashMap<>();

        if (roomName == null || roomName.isBlank() || identifier == null) {
            response.put("error", "roomName and accountId/email are required");
            return ResponseEntity.badRequest().body(response);
        }

        // Resolve display name via MemberLookup (works with DefaultMemberLookup now, real Auth later)
        List<MemberDto> members = memberLookup.findMembers(List.of(identifier));
        String displayName = (!members.isEmpty() && members.get(0).fullName() != null)
                ? members.get(0).fullName()
                : identifier;

        // Role-specific classroom membership validation
        boolean isFaculty;
        if ("FACULTY".equals(requestedRole)) {
            if (!meeting.facultyValidationByIdentifier(roomName, identifier)) {
                response.put("error", "Access denied: faculty not assigned to classroom " + roomName);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            isFaculty = true;
        } else if ("STUDENT".equals(requestedRole)) {
            if (!meeting.studentValidationByIdentifier(roomName, identifier)) {
                response.put("error", "Access denied: student not enrolled in classroom " + roomName);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            isFaculty = false;
        } else {
            // Auto-detect role from database assignment/enrollment when role is omitted
            if (meeting.facultyValidationByIdentifier(roomName, identifier)) {
                isFaculty = true;
            } else if (meeting.studentValidationByIdentifier(roomName, identifier)) {
                isFaculty = false;
            } else {
                response.put("error", "Access denied: user is neither assigned faculty nor enrolled in " + roomName);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
        }

        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setIdentity(identifier);
        token.setName(displayName);
        token.addGrants(
                new RoomJoin(true),
                new RoomName(roomName),
                new RoomAdmin(isFaculty),
                new RoomCreate(isFaculty),
                new CanPublish(true),
                new CanSubscribe(true)
        );

        response.put("token", token.toJwt());
        response.put("roomName", roomName);
        response.put("identity", identifier);
        response.put("name", displayName);
        response.put("role", isFaculty ? "FACULTY" : "STUDENT");
        if (livekitUrl != null && !livekitUrl.isBlank()) {
            response.put("url", livekitUrl);
        }

        return ResponseEntity.ok(response);
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }
}