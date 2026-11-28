package com.block_a.edu_meet.security;

import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.repository.UserRepository;
import com.block_a.edu_meet.services.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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

		String token = header.substring(7);
		LogInModel session = AuthService.logIn(token);
		if (session != null) {
			AuthenticatedUser user = AuthenticatedUser.from(session);
			if (user == null) {
				response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid authenticated user.");
				return;
			}
			authenticate(user);
			filterChain.doFilter(request, response);
			return;
		}

		if (!jwtService.isTokenValid(token)) {
			filterChain.doFilter(request, response);
			return;
		}

		Integer userId = jwtService.extractUserId(token);
		User user = userRepository.findByIdAndDeletedAtIsNull(userId).orElse(null);
		AuthenticatedUser authenticatedUser = AuthenticatedUser.from(user);
		if (authenticatedUser != null) {
			authenticate(authenticatedUser);
		}

		filterChain.doFilter(request, response);
	}

	private void authenticate(AuthenticatedUser user) {
		if (SecurityContextHolder.getContext().getAuthentication() != null) {
			return;
		}

		List<SimpleGrantedAuthority> authorities = new ArrayList<>();
		authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
		String role = user.normalizedRole();
		if (!role.isBlank() && !"user".equals(role)) {
			authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT)));
		}

		UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
				user,
				null,
				authorities);
		SecurityContextHolder.getContext().setAuthentication(authentication);
	}
}
