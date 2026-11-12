package com.block_a.edu_meet.service;

import com.block_a.edu_meet.dto.LoginRequest;
import com.block_a.edu_meet.dto.LoginResponse;
import com.block_a.edu_meet.dto.UserResponse;
import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.exception.ApiException;
import com.block_a.edu_meet.repository.UserRepository;
import com.block_a.edu_meet.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		User user = userRepository.findByEmailAndDeletedAtIsNull(request.getEmail().trim().toLowerCase())
				.orElseThrow(() -> new ApiException("Invalid email or password", HttpStatus.UNAUTHORIZED));

		if (!user.isActive()) {
			throw new ApiException("User account is inactive", HttpStatus.FORBIDDEN);
		}

		if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
			throw new ApiException("Invalid email or password", HttpStatus.UNAUTHORIZED);
		}

		String token = jwtService.generateToken(user);
		return new LoginResponse(token, UserResponse.from(user));
	}
}
