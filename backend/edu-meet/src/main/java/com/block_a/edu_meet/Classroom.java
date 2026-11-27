package com.block_a.edu_meet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "classrooms")
public class Classroom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_name", nullable = false, unique = true, length = 100)
    private String roomName;

    @Column(name = "faculty_in_charge", nullable = false, length = 100)
    private String facultyInCharge;

    protected Classroom() {
    }

    public Classroom(String roomName, String facultyInCharge) {
        this.roomName = roomName;
        this.facultyInCharge = facultyInCharge;
    }

    public Long getId() {
        return id;
    }

    public String getRoomName() {
        return roomName;
    }

    public String getFacultyInCharge() {
        return facultyInCharge;
    }
}
