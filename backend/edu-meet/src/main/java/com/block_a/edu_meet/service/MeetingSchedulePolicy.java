package com.block_a.edu_meet.service;

import com.block_a.edu_meet.room.WeeklyClassSchedule;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;

@Service
public class MeetingSchedulePolicy {

    private static final long EARLY_JOIN_MINUTES = 10;

    public boolean canJoin(WeeklyClassSchedule schedule, ZonedDateTime now) {
        ZonedDateTime localNow = now.withZoneSameInstant(schedule.zoneId());
        if (localNow.getDayOfWeek() != schedule.day()) {
            return false;
        }

        LocalDateTime currentTime = localNow.toLocalDateTime();
        LocalDateTime scheduledStart = localNow.toLocalDate().atTime(schedule.startsAt());
        LocalDateTime scheduledEnd = localNow.toLocalDate().atTime(schedule.endsAt());
        return !currentTime.isBefore(scheduledStart.minusMinutes(EARLY_JOIN_MINUTES))
                && !currentTime.isAfter(scheduledEnd);
    }
}
