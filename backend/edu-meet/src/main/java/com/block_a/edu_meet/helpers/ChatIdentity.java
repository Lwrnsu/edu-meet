package com.block_a.edu_meet.helpers;

import java.security.Principal;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.security.PhpChatAccount;

public final class ChatIdentity {
    private ChatIdentity() {}

    public static PhpChatAccount require(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof PhpChatAccount account) {
            return account;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to use chat");
    }

    public static String userId(Principal principal) {
        return require(principal).userId();
    }

    public static Optional<Integer> phpAccountId(String userId) {
        if (userId == null || !userId.startsWith("php:")) return Optional.empty();
        String id = userId.substring(4);
        try {
            int value = Integer.parseInt(id);
            return value > 0 && Integer.toString(value).equals(id) ? Optional.of(value) : Optional.empty();
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }
}
