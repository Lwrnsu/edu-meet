package com.block_a.edu_meet.helpers;

import java.security.Principal;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.security.JwtAccount;

public final class ChatIdentity {
    private ChatIdentity() {}

    public static JwtAccount require(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof JwtAccount account
                && account.expiresAt().isAfter(Instant.now())) {
            return account;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to use chat");
    }

    public static String userId(Principal principal) {
        return Integer.toString(require(principal).id());
    }
}
