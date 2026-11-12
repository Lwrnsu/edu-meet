package com.block_a.edu_meet.config;

import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminUserSeeder.class);

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public AdminUserSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (userRepository.countByDeletedAtIsNull() > 0) {
			return;
		}

		User admin = new User();
		admin.setEmail("admin@edu-meet.local");
		admin.setPassword(passwordEncoder.encode("admin123"));
		admin.setFirstName("Admin");
		admin.setLastName("User");
		admin.setStatus(User.STATUS_ACTIVE);
		userRepository.save(admin);

		log.info("Seeded default admin user: admin@edu-meet.local / admin123");
	}
}
