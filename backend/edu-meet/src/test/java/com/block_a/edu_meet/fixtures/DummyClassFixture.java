package com.block_a.edu_meet.fixtures;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * Synthetic test data only. This fixture is never persisted to an application database.
 */
public final class DummyClassFixture {

    public static final ClassData CLASS = new ClassData(
            91001,
            "DUMMY - Discrete Structures 2",
            97001,
            98001,
            List.of(new BlockData(
                    92001,
                    "DUMMY - BSCS-2A",
                    List.of(93001),
                    new ScheduleData(DayOfWeek.MONDAY, LocalTime.of(7, 0), LocalTime.of(11, 0)))));

    private DummyClassFixture() {
    }

    public record ClassData(int id, String subject, int facultyId, int departmentId, List<BlockData> blocks) {
    }

    public record BlockData(int id, String section, List<Integer> studentIds, ScheduleData schedule) {
    }

    public record ScheduleData(DayOfWeek day, LocalTime startsAt, LocalTime endsAt) {
    }
}
