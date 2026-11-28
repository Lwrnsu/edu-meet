
package com.block_a.edu_meet.quizexam.service;

import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.repository.StudentScoreHistoryRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StudentScoreHistoryService {

    private final StudentScoreHistoryRepository repository;

    public StudentScoreHistoryService(
            StudentScoreHistoryRepository repository
    ) {
        this.repository = repository;
    }

    // RETRIEVE ALL PREVIOUS ASSESSMENT RESULTS FOR A STUDENT
    @Transactional(readOnly = true)
    public List<StudentScoreResponse> getScoreHistory(Integer studentId) {

        if (studentId == null || studentId <= 0) {
            throw new IllegalArgumentException(
                "A valid student ID is required."
            );
        }

        return repository.findAllByStudentId(studentId);
    }
}
