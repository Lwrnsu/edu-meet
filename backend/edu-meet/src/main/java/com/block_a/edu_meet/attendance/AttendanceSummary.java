package com.block_a.edu_meet.attendance;

import java.time.Instant;

public record AttendanceSummary(
        String roomName,
        String roomSid,
        String participantIdentity,
        Instant firstJoinAt,
        long minutesInside,
        long minutesAway) {}
