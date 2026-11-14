package com.block_a.edu_meet.placeholder;

import java.util.List;

import org.springframework.stereotype.Component;

import com.block_a.edu_meet.chat.MemberDto;
import com.block_a.edu_meet.chat.MemberLookup;

@Component
public class PlaceholderMemberLookup implements MemberLookup {

    private final UserRepository userRepository;

    public PlaceholderMemberLookup(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public List<MemberDto> findMembers(List<String> userIds) {
        return userRepository.findAllById(userIds).stream()
                .map(u -> new MemberDto(u.getId(), u.getFullName(), u.getStudentId(), u.getAvatarUrl()))
                .toList();
    }
}