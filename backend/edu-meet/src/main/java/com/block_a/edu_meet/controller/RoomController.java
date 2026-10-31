package com.block_a.edu_meet.controller;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/room")
@CrossOrigin(origins = "*")
public class RoomController {

    private final String apiKey;
    private final String apiSecret;

    public RoomController(
            @Value("${livekit.api-key}") String apiKey,
            @Value("${livekit.api-secret}") String apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    @PostMapping("/token")
    public ResponseEntity getToken(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String participantName = params.get("participantName");

        Map<String, String> response = new HashMap<>();

        if (roomName == null || participantName == null) {
            response.put("error", "roomName and participantName are required");
            return ResponseEntity.badRequest().body(response);
        }

        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setIdentity(participantName);
        token.setName(participantName);
        
        token.addGrants(new RoomJoin(true), new RoomName(roomName));

        String jwtToken = token.toJwt();

        response.put("token", jwtToken);
        return ResponseEntity.ok(response);
    }
}