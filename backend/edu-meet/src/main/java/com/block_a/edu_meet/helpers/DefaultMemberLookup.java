package com.block_a.edu_meet.helpers;

import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Component;
import com.block_a.edu_meet.dtos.MemberDto;

@Component
public class DefaultMemberLookup implements MemberLookup {
    @Override
    public List<MemberDto> findMembers(List<String> userIds) {
        return Collections.emptyList();
    }
}