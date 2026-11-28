package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.Classroom;
import com.block_a.edu_meet.ClassroomEnrollment;
import com.block_a.edu_meet.Student;
import com.block_a.edu_meet.repository.ClassroomEnrollmentRepository;
import com.block_a.edu_meet.repository.ClassroomRepository;
import com.block_a.edu_meet.repository.StudentRepository;
import com.block_a.edu_meet.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {

    private static final String[] CLASS_ADMIN_ROLES = {
            "dean", "college_dean", "school_admin", "college_admin", "system_admin"
    };

    private final ClassroomRepository classroomRepository;
    private final StudentRepository studentRepository;
    private final ClassroomEnrollmentRepository enrollmentRepository;

    public ClassroomController(
            ClassroomRepository classroomRepository,
            StudentRepository studentRepository,
            ClassroomEnrollmentRepository enrollmentRepository) {
        this.classroomRepository = classroomRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @PostMapping
    public ResponseEntity<?> createClassroom(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        requireRole(authentication, CLASS_ADMIN_ROLES);
        String roomName = body.get("roomName");
        String facultyUsername = body.getOrDefault("facultyUsername", body.get("facultyAccountId"));
        String facultyAccountId = body.get("facultyAccountId");
        String facultyEmail = body.get("facultyEmail");

        if (roomName == null || roomName.isBlank() || facultyUsername == null || facultyUsername.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "roomName and facultyAccountId/facultyUsername are required"));
        }

        if (classroomRepository.findByRoomName(roomName).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Classroom already exists: " + roomName));
        }

        Classroom classroom = new Classroom(roomName.trim(), facultyUsername.trim(), facultyAccountId, facultyEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(classroomRepository.save(classroom));
    }

    @PutMapping("/{roomName}/faculty")
    public ResponseEntity<?> assignFaculty(
            @PathVariable String roomName,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        requireRole(authentication, CLASS_ADMIN_ROLES);
        Classroom classroom = classroomRepository.findByRoomName(roomName).orElse(null);
        if (classroom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Classroom not found: " + roomName));
        }
        if (body.get("facultyAccountId") != null) classroom.setFacultyAccountId(body.get("facultyAccountId"));
        if (body.get("facultyEmail") != null) classroom.setFacultyEmail(body.get("facultyEmail"));
        if (body.get("facultyUsername") != null) classroom.setFacultyInCharge(body.get("facultyUsername"));
        return ResponseEntity.ok(classroomRepository.save(classroom));
    }

    @PostMapping("/{roomName}/enroll")
    public ResponseEntity<?> enrollStudent(
            @PathVariable String roomName,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        AuthenticatedUser actor = requireRole(
                authentication,
                "faculty",
                "dean",
                "college_dean",
                "school_admin",
                "college_admin",
                "system_admin");
        Classroom classroom = classroomRepository.findByRoomName(roomName).orElse(null);
        if (classroom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Classroom not found: " + roomName));
        }

        if (actor.hasAnyRole("faculty") && !isAssignedFaculty(classroom, actor)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Faculty may enroll students only in their assigned classroom.");
        }

        String accountId = body.get("accountId");
        String email = body.get("email");
        String username = body.getOrDefault("username", accountId != null ? accountId : email);
        String name = body.getOrDefault("name", username);

        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "accountId, email, or username is required"));
        }

        Student student = (accountId != null ? studentRepository.findByAccountId(accountId) : java.util.Optional.<Student>empty())
                .or(() -> email != null ? studentRepository.findByEmail(email) : java.util.Optional.empty())
                .orElseGet(() -> studentRepository.save(new Student(accountId, email, username, name)));

        if (enrollmentRepository.existsByClassroom_IdAndStudent_Id(classroom.getId(), student.getId())) {
            return ResponseEntity.ok(Map.of("message", "Student already enrolled", "roomName", roomName, "studentId", student.getId()));
        }

        enrollmentRepository.save(new ClassroomEnrollment(classroom, student));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Enrolled successfully",
                "classroomId", classroom.getId(),
                "roomName", classroom.getRoomName(),
                "studentId", student.getId(),
                "accountId", student.getAccountId() != null ? student.getAccountId() : ""
        ));
    }

    @GetMapping
    public List<Classroom> listClassrooms(Authentication authentication) {
        requireRole(authentication, CLASS_ADMIN_ROLES);
        return classroomRepository.findAll();
    }

    private static AuthenticatedUser requireRole(Authentication authentication, String... allowedRoles) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "A verified authenticated user is required.");
        }
        if (!user.hasAnyRole(allowedRoles)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your account is not authorized to manage classrooms.");
        }
        return user;
    }

    private static boolean isAssignedFaculty(Classroom classroom, AuthenticatedUser faculty) {
        String identity = Integer.toString(faculty.id());
        return matches(classroom.getFacultyAccountId(), identity)
                || matches(classroom.getFacultyAccountId(), faculty.email())
                || matches(classroom.getFacultyEmail(), faculty.email())
                || matches(classroom.getFacultyInCharge(), identity)
                || matches(classroom.getFacultyInCharge(), faculty.email());
    }

    private static boolean matches(String actual, String expected) {
        return actual != null && expected != null && actual.equalsIgnoreCase(expected);
    }
}