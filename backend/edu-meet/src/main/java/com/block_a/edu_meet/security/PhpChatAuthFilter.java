package com.block_a.edu_meet.security;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

final class PhpChatAuthFilter extends OncePerRequestFilter {
    static final String AUTHORITY = "CHAT_PHP_ACCOUNT";
    static final String CHAT_PATH = "/api/chat/**";
    static final String CONVERSATION_PATH = "/api/conversations/**";

    private final PathPatternRequestMatcher chatPath = PathPatternRequestMatcher.withDefaults().matcher(CHAT_PATH);
    private final PathPatternRequestMatcher conversationPath =
            PathPatternRequestMatcher.withDefaults().matcher(CONVERSATION_PATH);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !chatPath.matches(request) && !conversationPath.matches(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            PhpChatAccount account = PhpChatAccount.fromSession(header.substring(7));
            if (account != null) {
                var authentication = UsernamePasswordAuthenticationToken.authenticated(
                        account, null, List.of(new SimpleGrantedAuthority(AUTHORITY)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        chain.doFilter(request, response);
    }
}
