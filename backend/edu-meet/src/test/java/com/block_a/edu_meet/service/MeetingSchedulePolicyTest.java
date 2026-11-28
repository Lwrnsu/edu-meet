package com.block_a.edu_meet.service;

import com.block_a.edu_meet.fixtures.DummyClassFixture;
import com.block_a.edu_meet.room.WeeklyClassSchedule;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MeetingSchedulePolicyTest {

    private static final ZoneId DUMMY_ZONE = ZoneId.of("Asia/Manila");
    private static final WeeklyClassSchedule DUMMY_SCHEDULE = new WeeklyClassSchedule(
            DummyClassFixture.CLASS.id(),
            DummyClassFixture.CLASS.blocks().get(0).id(),
            DummyClassFixture.CLASS.blocks().get(0).schedule().day(),
            DummyClassFixture.CLASS.blocks().get(0).schedule().startsAt(),
            DummyClassFixture.CLASS.blocks().get(0).schedule().endsAt(),
            DUMMY_ZONE);

    private final MeetingSchedulePolicy policy = new MeetingSchedulePolicy();

    @Test
    void allowsJoiningAtTenMinutesBeforeStartAndThroughTheScheduledEnd() {
        assertTrue(policy.canJoin(DUMMY_SCHEDULE, at(6, 50)));
        assertTrue(policy.canJoin(DUMMY_SCHEDULE, at(11, 0)));
    }

    @Test
    void rejectsJoiningBeforeTheWindowAfterTheEndOrOnAnotherDay() {
        assertFalse(policy.canJoin(DUMMY_SCHEDULE, at(6, 49)));
        assertFalse(policy.canJoin(DUMMY_SCHEDULE, at(11, 1)));
        assertFalse(policy.canJoin(DUMMY_SCHEDULE, at(8, 0).plusDays(1)));
    }

    private static ZonedDateTime at(int hour, int minute) {
        return ZonedDateTime.of(2026, 11, 30, hour, minute, 0, 0, DUMMY_ZONE);
    }
}
