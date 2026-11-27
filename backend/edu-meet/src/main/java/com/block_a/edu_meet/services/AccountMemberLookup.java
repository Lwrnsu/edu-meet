package com.block_a.edu_meet.services;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.block_a.edu_meet.dtos.MemberDto;
import com.block_a.edu_meet.entity.User;
import com.block_a.edu_meet.helpers.MemberLookup;
import com.block_a.edu_meet.repository.UserRepository;

@Component
public class AccountMemberLookup implements MemberLookup {

    private final UserRepository users;

    public AccountMemberLookup(UserRepository users) {
        this.users = users;
    }

    @Override
    public List<MemberDto> findMembers(List<String> userIds) {
        List<Integer> ids = userIds.stream().map(AccountMemberLookup::accountId)
                .flatMap(Optional::stream).distinct().toList();
        if (ids.isEmpty()) return List.of();

        var accounts = users.findByIdInAndDeletedAtIsNull(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return ids.stream().filter(accounts::containsKey)
                .map(accounts::get)
                .map(user -> new MemberDto(user.getId().toString(),
                        (user.getFirstName() + " " + user.getLastName()).strip(), null, null))
                .toList();
    }

    private static Optional<Integer> accountId(String id) {
        try {
            int value = Integer.parseInt(id);
            return value > 0 && Integer.toString(value).equals(id) ? Optional.of(value) : Optional.empty();
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }
}
