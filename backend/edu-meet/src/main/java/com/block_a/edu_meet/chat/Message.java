package com.block_a.edu_meet.chat;

import java.time.Instant;

public class Message {

    private String id;
    private String senderId;
    private String receiverId;
    private String text;
    private Instant timestamp;

    public Message() {
    }

    public Message(String senderId, String receiverId, String text, Instant timestamp) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.text = text;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}