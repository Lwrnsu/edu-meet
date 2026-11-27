package com.block_a.edu_meet.service;

import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.Room;
import io.livekit.server.RoomServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import retrofit2.Call;
import retrofit2.Response;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LiveKitPresenceServiceTest {

    @Test
    void reportsWhetherTheAssignedFacultyIsCurrentlyInTheRoom() throws Exception {
        String roomName = "class-91001-block-92001";
        String facultyIdentity = "97001";
        RoomServiceClient client = mock(RoomServiceClient.class);
        @SuppressWarnings("unchecked")
        Call<List<Room>> roomsCall = mock(Call.class);
        @SuppressWarnings("unchecked")
        Call<List<ParticipantInfo>> participantsCall = mock(Call.class);
        when(client.listRooms(List.of(roomName))).thenReturn(roomsCall);
        when(roomsCall.execute()).thenReturn(Response.success(List.of(
                Room.newBuilder().setName(roomName).build())));
        when(client.listParticipants(roomName)).thenReturn(participantsCall);
        when(participantsCall.execute()).thenReturn(Response.success(List.of(
                ParticipantInfo.newBuilder().setIdentity(facultyIdentity).build())));

        LiveKitPresenceService service = new LiveKitPresenceService(
                "wss://livekit.example.test",
                "test-api-key",
                "test-api-secret",
                client);

        assertTrue(service.isParticipantPresent(roomName, facultyIdentity));
        assertFalse(service.isParticipantPresent(roomName, "97002"));
    }

    @Test
    void doesNotListParticipantsWhenTheRoomDoesNotExist() throws Exception {
        String roomName = "class-91001-block-92001";
        RoomServiceClient client = mock(RoomServiceClient.class);
        @SuppressWarnings("unchecked")
        Call<List<Room>> roomsCall = mock(Call.class);
        when(client.listRooms(List.of(roomName))).thenReturn(roomsCall);
        when(roomsCall.execute()).thenReturn(Response.success(List.of()));

        LiveKitPresenceService service = new LiveKitPresenceService(
                "wss://livekit.example.test",
                "test-api-key",
                "test-api-secret",
                client);

        assertFalse(service.isParticipantPresent(roomName, "97001"));
        verify(client, never()).listParticipants(roomName);
    }

    @Test
    void reportsMisconfigurationInsteadOfAssumingNoOneIsPresent() {
        LiveKitPresenceService service = new LiveKitPresenceService("", "", "", null);

        assertThrows(
                ResponseStatusException.class,
                () -> service.isParticipantPresent("class-91001-block-92001", "97001"));
    }
}
