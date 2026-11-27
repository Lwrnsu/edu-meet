package com.block_a.edu_meet.service;

import io.livekit.server.RoomServiceClient;
import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.Room;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import retrofit2.Response;

import java.io.IOException;
import java.util.List;

@Service
public class LiveKitPresenceService {

    private final String url;
    private final String apiKey;
    private final String apiSecret;
    private final RoomServiceClient client;

    @Autowired
    public LiveKitPresenceService(
            @Value("${livekit.url:}") String url,
            @Value("${livekit.api-key:}") String apiKey,
            @Value("${livekit.api-secret:}") String apiSecret) {
        this(url, apiKey, apiSecret, createClient(url, apiKey, apiSecret));
    }

    LiveKitPresenceService(String url, String apiKey, String apiSecret, RoomServiceClient client) {
        this.url = url;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.client = client;
    }

    public boolean isParticipantPresent(String roomName, String identity) {
        if (roomName == null || roomName.isBlank() || identity == null || identity.isBlank()) {
            throw new IllegalArgumentException("Room name and participant identity are required");
        }
        if (url.isBlank() || apiKey.isBlank() || apiSecret.isBlank() || client == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "LiveKit presence is not configured");
        }

        try {
            Response<List<Room>> roomsResponse = client.listRooms(List.of(roomName)).execute();
            if (!roomsResponse.isSuccessful()) {
                throw presenceUnavailable();
            }
            List<Room> rooms = roomsResponse.body();
            if (rooms == null) {
                throw presenceUnavailable();
            }
            if (rooms.stream().noneMatch(room -> roomName.equals(room.getName()))) {
                return false;
            }

            Response<List<ParticipantInfo>> participantsResponse =
                    client.listParticipants(roomName).execute();
            if (participantsResponse.code() == 404) {
                return false;
            }
            if (!participantsResponse.isSuccessful() || participantsResponse.body() == null) {
                throw presenceUnavailable();
            }
            return participantsResponse.body().stream()
                    .anyMatch(participant -> identity.equals(participant.getIdentity()));
        } catch (IOException exception) {
            throw presenceUnavailable();
        }
    }

    private static String normalizeUrl(String value) {
        if (value.startsWith("wss://")) {
            return "https://" + value.substring("wss://".length());
        }
        if (value.startsWith("ws://")) {
            return "http://" + value.substring("ws://".length());
        }
        return value;
    }

    private static RoomServiceClient createClient(String url, String apiKey, String apiSecret) {
        if (url == null || url.isBlank() || apiKey == null || apiKey.isBlank()
                || apiSecret == null || apiSecret.isBlank()) {
            return null;
        }
        return RoomServiceClient.create(normalizeUrl(url), apiKey, apiSecret);
    }

    private static ResponseStatusException presenceUnavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Could not verify current LiveKit room presence");
    }
}
