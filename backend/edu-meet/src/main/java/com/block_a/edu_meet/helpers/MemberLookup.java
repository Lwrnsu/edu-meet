package com.block_a.edu_meet.helpers;

import java.util.List;

import com.block_a.edu_meet.dtos.MemberDto;

// Looks up display information for conversation members. Referenced by the chat
// controllers and implemented by DefaultMemberLookup / AccountMemberLookup;
// the interface itself was missing from main.
public interface MemberLookup {

    List<MemberDto> findMembers(List<String> userIds);
}
