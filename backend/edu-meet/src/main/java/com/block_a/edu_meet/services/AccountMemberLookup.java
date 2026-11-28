package com.block_a.edu_meet.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import com.block_a.edu_meet.dtos.MemberDto;
import com.block_a.edu_meet.helpers.ChatIdentity;
import com.block_a.edu_meet.helpers.MemberLookup;

@Component
public class AccountMemberLookup implements MemberLookup {
    private final NamedParameterJdbcTemplate jdbc;
    private final String selectMembers;

    public AccountMemberLookup(NamedParameterJdbcTemplate jdbc, @Value("${app.chat.php-schema:EduMeet}") String schema) {
        if (!schema.matches("[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException("Invalid PHP database schema");
        }
        this.jdbc = jdbc;
        this.selectMembers = """
                SELECT user_id, TRIM(CONCAT_WS(' ', first_name, NULLIF(middle_name, ''),
                    last_name, NULLIF(suffix, ''))) AS full_name
                FROM `%s`.users
                WHERE user_id IN (:ids) AND status = 1 AND deleted_at IS NULL
                """.formatted(schema);
    }

    @Override
    public List<MemberDto> findMembers(List<String> userIds) {
        List<Integer> ids = userIds.stream().map(ChatIdentity::phpAccountId)
                .flatMap(Optional::stream).distinct().toList();
        if (ids.isEmpty()) return List.of();

        var accounts = jdbc.query(selectMembers, Map.of("ids", ids), (row, index) ->
                new MemberDto("php:" + row.getInt("user_id"), row.getString("full_name"), null, null))
                .stream().collect(Collectors.toMap(MemberDto::id, Function.identity()));
        return ids.stream().map(id -> accounts.get("php:" + id)).filter(java.util.Objects::nonNull).toList();
    }
}
