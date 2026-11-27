package com.block_a.edu_meet.security;

import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final UserRepository userRepository;

	public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
		this.jwtService = jwtService;
		this.userRepository = userRepository;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);

		if (header == null || !header.startsWith("Bearer ")) {
			filterChain.doFilter(request, response);
			return;
		}

		if (SecurityContextHolder.getContext().getAuthentication() == null) {
			jwtService.verifyAccountToken(header.substring(7)).ifPresent(token ->
					userRepository.findByIdAndDeletedAtIsNull(token.userId())
							.filter(User::isActive)
							.ifPresent(user -> SecurityContextHolder.getContext().setAuthentication(
									UsernamePasswordAuthenticationToken.authenticated(
											new JwtAccount(user.getId(), user.getEmail(), token.expiresAt()),
											null, List.of(new SimpleGrantedAuthority("ROLE_USER"))))));
		}

		filterChain.doFilter(request, response);
	}
}
