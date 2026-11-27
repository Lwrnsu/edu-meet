package com.block_a.edu_meet.attendance;

import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.Room;
import livekit.LivekitWebhook.WebhookEvent;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AttendanceServiceTest {

    @Test
    void tracksFirstJoinTimeAndInsideAndAwayMinutes() {
        AttendanceService service = new AttendanceService();
        service.process(event("evt-1", "participant_joined", "student-1", 1_800_000_000L));
        service.process(event("evt-2", "participant_left", "student-1", 1_800_000_600L));
        service.process(event("evt-3", "participant_joined", "student-1", 1_800_000_900L));
        service.process(event("evt-4", "room_finished", null, 1_800_001_800L));

        List<AttendanceSummary> result = service.getRoomAttendance("class-101", Instant.now());

        assertEquals(1, result.size());
        assertEquals(Instant.ofEpochSecond(1_800_000_000L), result.get(0).firstJoinAt());
        assertEquals(25, result.get(0).minutesInside());
        assertEquals(5, result.get(0).minutesAway());
    }

    @Test
    void ignoresDuplicateWebhookEvents() {
        AttendanceService service = new AttendanceService();
        WebhookEvent join = event("same-id", "participant_joined", "student-1", 1_800_000_000L);
        service.process(join);
        service.process(join);
        service.process(event("evt-2", "participant_left", "student-1", 1_800_000_600L));
        service.process(event("evt-3", "room_finished", null, 1_800_000_600L));

        List<AttendanceSummary> result = service.getRoomAttendance("class-101", Instant.now());

        assertEquals(1, result.size());
        assertEquals(10, result.get(0).minutesInside());
    }

    @Test
    void ignoresLateJoinEventsForFinishedRooms() {
        AttendanceService service = new AttendanceService();
        service.process(event("evt-1", "room_finished", null, 1_800_000_600L));
        service.process(event("evt-2", "participant_joined", "student-1", 1_800_000_000L));

        assertEquals(List.of(), service.getRoomAttendance("class-101", Instant.now()));
    }

    private static WebhookEvent event(String id, String type, String identity, long createdAt) {
        WebhookEvent.Builder builder = WebhookEvent.newBuilder()
                .setId(id)
                .setEvent(type)
                .setCreatedAt(createdAt)
                .setRoom(Room.newBuilder().setName("class-101").setSid("room-sid"));
        if (identity != null) {
            builder.setParticipant(ParticipantInfo.newBuilder().setIdentity(identity));
        }
        return builder.build();
    }
}
