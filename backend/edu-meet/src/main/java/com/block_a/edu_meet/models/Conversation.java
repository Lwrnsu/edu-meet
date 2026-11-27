package com.block_a.edu_meet.models;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "conversations")
public class Conversation {

    @Id
    private String id;
    private ConversationType type;
    private String name;
    @Indexed
    private List<String> participantIds;
    @JsonIgnore
    private List<String> pinnedMessageIds = List.of();
    private String avatarUrl;
    private String blockId;
    private String classId;

    public Conversation() {
    }

    public Conversation(ConversationType type, String name, List<String> participantIds) {
        this.type = type;
        this.name = name;
        this.participantIds = participantIds;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public ConversationType getType() { return type; }
    public void setType(ConversationType type) { this.type = type; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getParticipantIds() { return participantIds; }
    public void setParticipantIds(List<String> participantIds) {
        this.participantIds = participantIds;
    }

        public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public List<String> getPinnedMessageIds() { return pinnedMessageIds; }

    public String getBlockId() { return blockId; }
    public void setBlockId(String blockId) { this.blockId = blockId; }

    public String getClassId() { return classId; }
    public void setClassId(String classId) { this.classId = classId; }
}

