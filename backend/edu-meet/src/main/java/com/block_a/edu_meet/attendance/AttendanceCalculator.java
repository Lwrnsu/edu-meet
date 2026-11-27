package com.block_a.edu_meet.attendance;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public class AttendanceCalculator {

    public record Stay(Instant joinedAt, Instant leftAt) {
        public Stay {
            if (joinedAt == null || (leftAt != null && leftAt.isBefore(joinedAt))) {
                throw new IllegalArgumentException("A stay must have a valid start and end time");
            }
        }
    }

    public record AttendanceResult(Instant firstJoin, long minutesInside, long minutesAway) {}

    public static AttendanceResult calculate(List<Stay> stays, Instant meetingEnd) {
        if (stays == null || stays.isEmpty()) {
            throw new IllegalArgumentException("At least one stay is required");
        }
        if (meetingEnd == null) throw new IllegalArgumentException("meetingEnd is required");

        List<Stay> sorted = stays.stream()
                .sorted(Comparator.comparing(Stay::joinedAt))
                .toList();

        Duration inside = Duration.ZERO;
        Duration away = Duration.ZERO;
        Instant previousLeft = null;

        for (Stay stay : sorted) {
            Instant left = stay.leftAt() == null ? meetingEnd : stay.leftAt();
            if (left.isBefore(stay.joinedAt())) {
                throw new IllegalArgumentException("A stay cannot end before it starts");
            }
            inside = inside.plus(Duration.between(stay.joinedAt(), left));

            if (previousLeft != null) {
                Duration gap = Duration.between(previousLeft, stay.joinedAt());
                if (!gap.isNegative()) away = away.plus(gap);
            }
            previousLeft = left;
        }

        // time after the last leave until the meeting ended
        if (previousLeft.isBefore(meetingEnd)) {
            away = away.plus(Duration.between(previousLeft, meetingEnd));
        }

        return new AttendanceResult(sorted.get(0).joinedAt(), inside.toMinutes(), away.toMinutes());
    }
}