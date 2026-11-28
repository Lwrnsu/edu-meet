package com.block_a.edu_meet.configs;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.block_a.edu_meet.handlers.ChatHandler;

@Configuration
@EnableWebSocket
public class CommunicationWSConfig implements WebSocketConfigurer {

    private final ChatHandler chatHandler;

    public CommunicationWSConfig(ChatHandler chatHandler) {
        this.chatHandler = chatHandler;
    }
// SUBJECT TO CHANGE: Route
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatHandler, "/chat").setAllowedOrigins("*");
    }
}
