package com.block_a.edu_meet.models;

import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "messages")
@CompoundIndex(name = "conversation_timestamp_id", def = "{'conversationId': 1, 'timestamp': -1, '_id': -1}")
public class Message {

    @Id
    private String id;
    private String conversationId;
    private String senderId;
    private String text;
    private Instant timestamp;
    private Attachment attachment;
    @JsonIgnore
    private byte[] attachmentBytes;

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

    public Attachment getAttachment() { return attachment; }
    public void setAttachment(Attachment attachment) { this.attachment = attachment; }

    public byte[] getAttachmentBytes() { return attachmentBytes; }
    public void setAttachmentBytes(byte[] attachmentBytes) { this.attachmentBytes = attachmentBytes; }

    public record Attachment(String name, String contentType, long size) {}

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
