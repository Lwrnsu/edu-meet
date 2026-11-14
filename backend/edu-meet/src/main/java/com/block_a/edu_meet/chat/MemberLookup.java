package com.block_a.edu_meet.chat;

import java.util.List;

public interface MemberLookup {

    List<MemberDto> findMembers(List<String> userIds);
}