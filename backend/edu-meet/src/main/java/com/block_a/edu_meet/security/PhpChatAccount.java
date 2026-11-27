package com.block_a.edu_meet.security;

import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.services.AuthService;

public record PhpChatAccount(int id, String sessionToken) {

    public static PhpChatAccount fromSession(String token) {
        LogInModel session = AuthService.findSession(token);
        if (session == null || session.getId() <= 0 || !LogInModel.PHP_SCHOOL.equals(session.getSource())) {
            return null;
        }
        return new PhpChatAccount(session.getId(), token);
    }

    public String userId() {
        return "php:" + id;
    }

    @Override
    public String toString() {
        return userId();
    }
}
