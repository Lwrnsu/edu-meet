package com.block_a.edu_meet.service;

import com.block_a.edu_meet.dto.UserRequest;
import com.block_a.edu_meet.dto.UserResponse;
import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.exception.ApiException;
import com.block_a.edu_meet.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional(readOnly = true)
	public List<UserResponse> findAll() {
		return userRepository.findAllByDeletedAtIsNull().stream().map(UserResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public UserResponse findById(Integer id) {
		return UserResponse.from(getActiveUser(id));
	}

	@Transactional
	public UserResponse create(UserRequest request) {
		if (request.getPassword() == null || request.getPassword().isBlank()) {
			throw new ApiException("Password is required", HttpStatus.BAD_REQUEST);
		}
		if (userRepository.existsByEmailAndDeletedAtIsNull(normalizeEmail(request.getEmail()))) {
			throw new ApiException("Email already in use", HttpStatus.CONFLICT);
		}

		User user = new User();
		applyRequest(user, request, true);
		return UserResponse.from(userRepository.save(user));
	}

	@Transactional
	public UserResponse update(Integer id, UserRequest request) {
		User user = getActiveUser(id);
		String email = normalizeEmail(request.getEmail());
		if (userRepository.existsByEmailAndIdNotAndDeletedAtIsNull(email, id)) {
			throw new ApiException("Email already in use", HttpStatus.CONFLICT);
		}
		applyRequest(user, request, false);
		return UserResponse.from(userRepository.save(user));
	}

	@Transactional
	public void softDelete(Integer id) {
		User user = getActiveUser(id);
		user.setDeletedAt(LocalDateTime.now());
		userRepository.save(user);
	}

	@Transactional(readOnly = true)
	public User getActiveUser(Integer id) {
		return userRepository.findByIdAndDeletedAtIsNull(id)
				.orElseThrow(() -> new ApiException("User not found", HttpStatus.NOT_FOUND));
	}

	private void applyRequest(User user, UserRequest request, boolean creating) {
		user.setEmail(normalizeEmail(request.getEmail()));
		user.setFirstName(request.getFirstName().trim());
		user.setLastName(request.getLastName().trim());
		user.setStatus(parseStatus(request.getStatus(), creating ? User.STATUS_ACTIVE : user.getStatus()));

		if (request.getPassword() != null && !request.getPassword().isBlank()) {
			user.setPassword(passwordEncoder.encode(request.getPassword()));
		} else if (creating) {
			throw new ApiException("Password is required", HttpStatus.BAD_REQUEST);
		}
	}

	private String normalizeEmail(String email) {
		return email.trim().toLowerCase();
	}

	private Short parseStatus(String status, Short fallback) {
		if (status == null || status.isBlank()) {
			return fallback;
		}
		String normalized = status.trim().toLowerCase();
		if ("active".equals(normalized) || "1".equals(normalized)) {
			return User.STATUS_ACTIVE;
		}
		if ("inactive".equals(normalized) || "0".equals(normalized)) {
			return User.STATUS_INACTIVE;
		}
		throw new ApiException("Status must be 'active' or 'inactive'", HttpStatus.BAD_REQUEST);
	}
}
