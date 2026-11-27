package com.block_a.edu_meet.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.block_a.edu_meet.Classroom;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    boolean existsByRoomNameAndFacultyInCharge(String roomName, String facultyInCharge);
}
