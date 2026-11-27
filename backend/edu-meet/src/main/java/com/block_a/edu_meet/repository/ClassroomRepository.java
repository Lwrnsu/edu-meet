package com.block_a.edu_meet.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.block_a.edu_meet.Classroom;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Optional<Classroom> findByRoomName(String roomName);
    boolean existsByRoomNameAndFacultyInCharge(String roomName, String facultyInCharge);
    boolean existsByRoomNameAndFacultyAccountId(String roomName, String facultyAccountId);
    boolean existsByRoomNameAndFacultyEmail(String roomName, String facultyEmail);
}