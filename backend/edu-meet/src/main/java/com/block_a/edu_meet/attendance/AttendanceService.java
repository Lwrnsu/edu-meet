package com.block_a.edu_meet.attendance;

import com.block_a.edu_meet.attendance.AttendanceCalculator.AttendanceResult;
import com.block_a.edu_meet.attendance.AttendanceCalculator.Stay;
import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.Room;
import livekit.LivekitWebhook.WebhookEvent;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AttendanceService {

    private final Map<ParticipantKey, ParticipantAttendance> attendance = new HashMap<>();
    private final Map<String, Instant> roomEndTimes = new HashMap<>();
    private final Set<String> processedEventIds = new HashSet<>();

    public synchronized void process(WebhookEvent event) {
        String eventType = event.getEvent();
        if (!eventType.equals("participant_joined")
                && !eventType.equals("participant_left")
                && !eventType.equals("room_finished")) {
            return;
        }
        if (!event.hasRoom() || event.getCreatedAt() <= 0) {
            throw new IllegalArgumentException("Attendance webhook must include a room and event timestamp");
        }

        Room room = event.getRoom();
        requireText(room.getName(), "room name");
        requireText(room.getSid(), "room SID");
        Instant eventTime = Instant.ofEpochSecond(event.getCreatedAt());

        if (eventType.equals("room_finished")) {
            finishRoom(room, eventTime);
            markProcessed(event);
            return;
        }

        if (!event.hasParticipant()) {
            throw new IllegalArgumentException("Participant webhook must include a participant");
        }
        ParticipantInfo participant = event.getParticipant();
        requireText(participant.getIdentity(), "participant identity");
        if (isAlreadyProcessed(event)) {
            return;
        }
        if (roomEndTimes.containsKey(room.getSid())) {
            markProcessed(event);
            return;
        }

        ParticipantKey key = new ParticipantKey(room.getSid(), participant.getIdentity());
        ParticipantAttendance record = attendance.computeIfAbsent(
                key, ignored -> new ParticipantAttendance(room.getName(), room.getSid(), participant.getIdentity()));

        if (record.meetingEnd != null) {
            markProcessed(event);
            return;
        }

        if (eventType.equals("participant_joined")) {
            Stay latest = record.stays.isEmpty() ? null : record.stays.get(record.stays.size() - 1);
            if (latest == null || latest.leftAt() != null) {
                record.stays.add(new Stay(eventTime, null));
            }
        } else {
            closeCurrentStay(record, eventTime);
        }
        markProcessed(event);
    }

    public synchronized List<AttendanceSummary> getRoomAttendance(String roomName, Instant now) {
        List<AttendanceSummary> result = new ArrayList<>();
        for (ParticipantAttendance record : attendance.values()) {
            if (!record.roomName.equals(roomName) || record.stays.isEmpty()) {
                continue;
            }
            Instant meetingEnd = record.meetingEnd == null ? now : record.meetingEnd;
            AttendanceResult totals = AttendanceCalculator.calculate(record.stays, meetingEnd);
            result.add(new AttendanceSummary(
                    record.roomName,
                    record.roomSid,
                    record.participantIdentity,
                    totals.firstJoin(),
                    totals.minutesInside(),
                    totals.minutesAway()));
        }
        return List.copyOf(result);
    }

    private void finishRoom(Room room, Instant eventTime) {
        Instant roomEnd = roomEndTimes.merge(
                room.getSid(),
                eventTime,
                (existing, incoming) -> existing.isBefore(incoming) ? existing : incoming);
        for (ParticipantAttendance record : attendance.values()) {
            if (record.roomSid.equals(room.getSid())) {
                record.meetingEnd = roomEnd;
            }
        }
    }

    private static void closeCurrentStay(ParticipantAttendance record, Instant leftAt) {
        if (record.stays.isEmpty()) {
            return;
        }
        int lastIndex = record.stays.size() - 1;
        Stay latest = record.stays.get(lastIndex);
        if (latest.leftAt() == null && !leftAt.isBefore(latest.joinedAt())) {
            record.stays.set(lastIndex, new Stay(latest.joinedAt(), leftAt));
        }
    }

    private boolean isAlreadyProcessed(WebhookEvent event) {
        return !event.getId().isBlank() && processedEventIds.contains(event.getId());
    }

    private void markProcessed(WebhookEvent event) {
        if (!event.getId().isBlank()) {
            processedEventIds.add(event.getId());
        }
    }

    private static void requireText(String value, String field) {
        if (value.isBlank()) {
            throw new IllegalArgumentException("Attendance webhook must include " + field);
        }
    }

    private record ParticipantKey(String roomSid, String participantIdentity) {}

    private static final class ParticipantAttendance {
        private final String roomName;
        private final String roomSid;
        private final String participantIdentity;
        private final List<Stay> stays = new ArrayList<>();
        private Instant meetingEnd;

        private ParticipantAttendance(String roomName, String roomSid, String participantIdentity) {
            this.roomName = roomName;
            this.roomSid = roomSid;
            this.participantIdentity = participantIdentity;
        }
    }
}
