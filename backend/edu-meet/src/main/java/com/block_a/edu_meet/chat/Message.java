
package com.block_a.edu_meet.chat;

import java.time.Instant;

public class Message {

    private String id;
    private String conversationId;
    private String senderId;
    private String text;
    private Instant timestamp;

    public Message() {
    }

    public Message(String conversationId, String senderId, String text, Instant timestamp) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.text = text;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
