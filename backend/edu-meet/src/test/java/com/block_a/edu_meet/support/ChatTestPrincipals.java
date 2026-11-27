package com.block_a.edu_meet.support;

import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.block_a.edu_meet.security.PhpChatAccount;

public final class ChatTestPrincipals {
    private ChatTestPrincipals() {}

    public static UsernamePasswordAuthenticationToken account(int id) {
        return UsernamePasswordAuthenticationToken.authenticated(phpAccount(id), null,
                List.of(new SimpleGrantedAuthority("CHAT_PHP_ACCOUNT")));
    }

    public static UsernamePasswordAuthenticationToken rosterManager() {
        return UsernamePasswordAuthenticationToken.authenticated(phpAccount(90), null,
                List.of(new SimpleGrantedAuthority("CHAT_ROSTER_ADMIN")));
    }

    public static PhpChatAccount phpAccount(int id) {
        return new PhpChatAccount(id, "test-session");
    }
}
