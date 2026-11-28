package com.block_a.edu_meet.helpers;

import java.util.List;

import com.block_a.edu_meet.dtos.MemberDto;

public interface MemberLookup {

    List<MemberDto> findMembers(List<String> userIds);
}
