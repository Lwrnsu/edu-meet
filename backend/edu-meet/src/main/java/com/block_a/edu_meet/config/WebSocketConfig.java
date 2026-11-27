package com.block_a.edu_meet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enables a simple broker to push real-time messages back to clients on "/topic"
        config.enableSimpleBroker("/topic");
        
        // Prefix for messages sent from the React frontend to backend methods (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // The main WebSocket endpoint your React frontend will connect to
        registry.addEndpoint("/ws-meeting")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}