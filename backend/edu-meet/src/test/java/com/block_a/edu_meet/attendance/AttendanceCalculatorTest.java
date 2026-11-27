package com.block_a.edu_meet.attendance;

import com.block_a.edu_meet.attendance.AttendanceCalculator.AttendanceResult;
import com.block_a.edu_meet.attendance.AttendanceCalculator.Stay;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AttendanceCalculatorTest {

    @Test
    void includesGapsAndTimeAfterTheLastDepartureAsAwayMinutes() {
        Instant start = Instant.parse("2026-11-24T10:00:00Z");
        AttendanceResult result = AttendanceCalculator.calculate(
                List.of(
                        new Stay(start, start.plusSeconds(600)),
                        new Stay(start.plusSeconds(900), start.plusSeconds(1_200))),
                start.plusSeconds(1_800));

        assertEquals(start, result.firstJoin());
        assertEquals(15, result.minutesInside());
        assertEquals(15, result.minutesAway());
    }
}
