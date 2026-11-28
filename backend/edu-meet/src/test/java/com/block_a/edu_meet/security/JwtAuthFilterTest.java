package com.block_a.edu_meet.security;

import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.repository.UserRepository;
import com.block_a.edu_meet.services.AuthService;
import jakarta.servlet.FilterChain;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verifyNoInteractions;

class JwtAuthFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesRedisSessionAndPreservesItsRole() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        UserRepository userRepository = mock(UserRepository.class);
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, userRepository);
        LogInModel session = new LogInModel(
                17,
                "faculty",
                Map.of(
                        "email", "faculty@example.test",
                        "first_name", "Trusted",
                        "last_name", "Faculty"));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer opaque-redis-session-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean continued = new AtomicBoolean();
        FilterChain chain = (req, res) -> continued.set(true);

        try (MockedStatic<AuthService> authService = mockStatic(AuthService.class)) {
            authService.when(() -> AuthService.logIn("opaque-redis-session-token"))
                    .thenReturn(session);

            filter.doFilter(request, response, chain);
        }

        AuthenticatedUser principal = (AuthenticatedUser) SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();
        assertTrue(continued.get());
        assertEquals(17, principal.id());
        assertEquals("faculty", principal.normalizedRole());
        assertEquals("faculty@example.test", principal.email());
        assertTrue(SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_FACULTY")));
        verifyNoInteractions(jwtService, userRepository);
    }
}
