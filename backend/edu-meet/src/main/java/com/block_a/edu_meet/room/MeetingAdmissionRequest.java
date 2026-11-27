package com.block_a.edu_meet.room;

import java.time.Instant;

public record MeetingAdmissionRequest(
        String requestId,
        int classId,
        int blockId,
        int requesterId,
        String requesterName,
        AdmissionRequestStatus status,
        Instant createdAt,
        boolean facultyPresent) {
}
