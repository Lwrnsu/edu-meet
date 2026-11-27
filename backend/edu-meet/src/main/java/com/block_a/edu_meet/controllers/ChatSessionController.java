package com.block_a.edu_meet.controllers;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.block_a.edu_meet.helpers.ChatIdentity;
import com.block_a.edu_meet.services.ChatSocketTickets;

@RestController
@RequestMapping("/api/chat")
public class ChatSessionController {
    private final ChatSocketTickets tickets;

    public ChatSessionController(ChatSocketTickets tickets) {
        this.tickets = tickets;
    }

    @GetMapping("/me")
    public ChatAccount me(Principal principal) {
        return new ChatAccount(ChatIdentity.userId(principal));
    }

    @PostMapping("/socket-ticket")
    public SocketTicket socketTicket(Principal principal) {
        return new SocketTicket(tickets.issue(ChatIdentity.require(principal)));
    }

    public record ChatAccount(String userId) {}
    public record SocketTicket(String ticket) {}
}
