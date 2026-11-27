package com.block_a.edu_meet;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "classroom_enrollments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_classroom_enrollment",
                columnNames = {"classroom_id", "student_id"}))
public class ClassroomEnrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    protected ClassroomEnrollment() {
    }

    public ClassroomEnrollment(Classroom classroom, Student student) {
        this.classroom = classroom;
        this.student = student;
    }

    public Long getId() {
        return id;
    }

    public Classroom getClassroom() {
        return classroom;
    }

    public Student getStudent() {
        return student;
    }
}