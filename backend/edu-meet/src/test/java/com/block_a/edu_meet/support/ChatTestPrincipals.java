package com.block_a.edu_meet.support;

import java.time.Instant;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.block_a.edu_meet.security.JwtAccount;

public final class ChatTestPrincipals {
    private ChatTestPrincipals() {}

    public static UsernamePasswordAuthenticationToken account(int id) {
        return UsernamePasswordAuthenticationToken.authenticated(jwtAccount(id), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    public static UsernamePasswordAuthenticationToken rosterManager() {
        return UsernamePasswordAuthenticationToken.authenticated(jwtAccount(90), null,
                List.of(new SimpleGrantedAuthority("CHAT_ROSTER_ADMIN")));
    }

    public static JwtAccount jwtAccount(int id) {
        return new JwtAccount(id, "test-" + id + "@example.test", Instant.now().plusSeconds(120));
    }
}
