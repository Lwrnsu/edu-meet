package com.block_a.edu_meet.chat;

import java.util.List;

public record MemberChangeRequest(List<String> userIds) {
}