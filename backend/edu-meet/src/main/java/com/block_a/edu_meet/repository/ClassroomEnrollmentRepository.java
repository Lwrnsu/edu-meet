package com.block_a.edu_meet.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.block_a.edu_meet.ClassroomEnrollment;

public interface ClassroomEnrollmentRepository extends JpaRepository<ClassroomEnrollment, Long> {
    boolean existsByClassroom_RoomNameAndStudent_Username(String roomName, String username);
}
