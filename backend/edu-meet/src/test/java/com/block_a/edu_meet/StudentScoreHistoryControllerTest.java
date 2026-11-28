
package com.block_a.edu_meet;

import com.block_a.edu_meet.quizexam.controller.StudentScoreHistoryController;
import com.block_a.edu_meet.quizexam.dto.StudentScoreResponse;
import com.block_a.edu_meet.quizexam.service.StudentScoreHistoryService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentScoreHistoryControllerTest {

    @Mock
    private StudentScoreHistoryService historyService;

    @InjectMocks
    private StudentScoreHistoryController controller;

    // STUDENT CAN ONLY REQUEST RESULTS USING THEIR AUTHENTICATED ID
    @Test
    void shouldUseAuthenticatedStudentIdInsteadOfRequestedId() {

        MockHttpServletRequest request = new MockHttpServletRequest();

        request.setAttribute("authenticatedStudentId", 42);
        request.setAttribute("authenticatedRole", "student");

        // Attempt to request another student's ID through a parameter.
        request.setParameter("studentId", "1");

        List<StudentScoreResponse> expectedResults = List.of();

        when(historyService.getScoreHistory(42))
            .thenReturn(expectedResults);

        ResponseEntity<List<StudentScoreResponse>> response =
            controller.getScoreHistory(request);

        assertEquals(
            HttpStatus.OK.value(),
            response.getStatusCode().value()
        );

        assertSame(expectedResults, response.getBody());

        // Only the authenticated student's ID reaches the service.
        verify(historyService).getScoreHistory(42);
        verify(historyService, never()).getScoreHistory(1);
    }

    // REJECT REQUESTS WITHOUT STUDENT AUTHENTICATION
    @Test
    void shouldRejectUnauthenticatedRequests() {

        MockHttpServletRequest request = new MockHttpServletRequest();

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> controller.getScoreHistory(request)
        );

        assertEquals(
            HttpStatus.UNAUTHORIZED.value(),
            exception.getStatusCode().value()
        );

        verifyNoInteractions(historyService);
    }

    // REJECT REQUESTS FROM NON-STUDENT ACCOUNTS
    @Test
    void shouldRejectNonStudentRoles() {

        MockHttpServletRequest request = new MockHttpServletRequest();

        request.setAttribute("authenticatedStudentId", 42);
        request.setAttribute("authenticatedRole", "faculty");

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> controller.getScoreHistory(request)
        );

        assertEquals(
            HttpStatus.FORBIDDEN.value(),
            exception.getStatusCode().value()
        );

        verifyNoInteractions(historyService);
    }
}
