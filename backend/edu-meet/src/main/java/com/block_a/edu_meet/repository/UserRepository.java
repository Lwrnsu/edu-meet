package com.block_a.edu_meet.repository;

import com.block_a.edu_meet.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {

	Optional<User> findByEmailAndDeletedAtIsNull(String email);

	Optional<User> findByIdAndDeletedAtIsNull(Integer id);

	List<User> findAllByDeletedAtIsNull();

	boolean existsByEmailAndDeletedAtIsNull(String email);

	boolean existsByEmailAndIdNotAndDeletedAtIsNull(String email, Integer id);

	long countByDeletedAtIsNull();
}
