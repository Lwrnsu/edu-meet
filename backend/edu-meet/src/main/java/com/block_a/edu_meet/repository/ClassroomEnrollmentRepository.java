package com.block_a.edu_meet.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.block_a.edu_meet.ClassroomEnrollment;

public interface ClassroomEnrollmentRepository extends JpaRepository<ClassroomEnrollment, Long> {
    boolean existsByClassroom_RoomNameAndStudent_Username(String roomName, String username);
    boolean existsByClassroom_RoomNameAndStudent_AccountId(String roomName, String accountId);
    boolean existsByClassroom_RoomNameAndStudent_Email(String roomName, String email);
    boolean existsByClassroom_IdAndStudent_Id(Long classroomId, Long studentId);
}