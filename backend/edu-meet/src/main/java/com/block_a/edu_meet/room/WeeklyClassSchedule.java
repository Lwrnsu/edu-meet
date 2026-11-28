package com.block_a.edu_meet.room;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;

public record WeeklyClassSchedule(
        int classId,
        int blockId,
        DayOfWeek day,
        LocalTime startsAt,
        LocalTime endsAt,
        ZoneId zoneId) {

    public WeeklyClassSchedule {
        if (classId <= 0 || blockId <= 0 || startsAt == null || endsAt == null
                || day == null || zoneId == null || !startsAt.isBefore(endsAt)) {
            throw new IllegalArgumentException("A valid weekly class schedule is required");
        }
    }
}
