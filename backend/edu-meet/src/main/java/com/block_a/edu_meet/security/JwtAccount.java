package com.block_a.edu_meet.security;

import java.security.Principal;
import java.time.Instant;

public record JwtAccount(int id, String email, Instant expiresAt) implements Principal {
    @Override
    public String getName() {
        return email;
    }
}
