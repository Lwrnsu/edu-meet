package com.block_a.edu_meet.room;

public record RoomTarget(
        int classId,
        String subject,
        int blockId,
        String section,
        int facultyId,
        int departmentId) {

    public String roomName() {
        return "class-" + classId + "-block-" + blockId;
    }
}
