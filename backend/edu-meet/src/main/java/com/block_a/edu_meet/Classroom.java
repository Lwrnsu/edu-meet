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

    @Column(name = "faculty_account_id", length = 100)
    private String facultyAccountId;

    @Column(name = "faculty_email", length = 150)
    private String facultyEmail;

    protected Classroom() {}

    public Classroom(String roomName, String facultyInCharge) {
        this.roomName = roomName;
        this.facultyInCharge = facultyInCharge;
    }

    public Classroom(String roomName, String facultyInCharge, String facultyAccountId, String facultyEmail) {
        this.roomName = roomName;
        this.facultyInCharge = facultyInCharge;
        this.facultyAccountId = facultyAccountId;
        this.facultyEmail = facultyEmail;
    }

    public Long getId() { return id; }
    public String getRoomName() { return roomName; }
    public String getFacultyInCharge() { return facultyInCharge; }
    public String getFacultyAccountId() { return facultyAccountId; }
    public String getFacultyEmail() { return facultyEmail; }

    public void setFacultyInCharge(String facultyInCharge) { this.facultyInCharge = facultyInCharge; }
    public void setFacultyAccountId(String facultyAccountId) { this.facultyAccountId = facultyAccountId; }
    public void setFacultyEmail(String facultyEmail) { this.facultyEmail = facultyEmail; }
}