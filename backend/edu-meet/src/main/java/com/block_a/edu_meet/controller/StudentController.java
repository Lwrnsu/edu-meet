package com.block_a.edu_meet.controller;

import com.block_a.edu_meet.Student;
import com.block_a.edu_meet.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/validate")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @GetMapping("/student")
    public ResponseEntity<?> validateStudent(@RequestParam String username) {
        Optional<Student> student = studentRepository.findByUsername(username);
        
        if (student.isPresent()) {
            return ResponseEntity.ok(student.get());
        } else {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Student not found");
            return ResponseEntity.status(404).body(errorResponse);
        }
    }
}