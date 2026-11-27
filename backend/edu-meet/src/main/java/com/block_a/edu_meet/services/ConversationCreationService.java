package com.block_a.edu_meet.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.stream.Collectors;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.helpers.CreateClassConversationRequest;
import com.block_a.edu_meet.helpers.CreateConversationRequest;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.repositories.ConversationRepository;

@Service
public class ConversationCreationService {

    private final ConversationRepository conversationRepository;

    public ConversationCreationService(ConversationRepository conversationRepository) {
        this.conversationRepository = conversationRepository;
    }

    /**
     * Creates or retrieves the class GC after the caller has verified permission and loaded the class roster.
     * Repeated calls return the existing GC without changing its membership.
     */
    public Conversation createClassConversation(CreateClassConversationRequest request) {
        if (request.classId() == null || request.classId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "classId is required");
        }
        if (request.facultyIds() == null || request.studentIds() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "facultyIds and studentIds are required");
        }

        var participantIds = new LinkedHashSet<>(request.facultyIds());
        participantIds.addAll(request.studentIds());
        return createConversation(new CreateConversationRequest(
                ConversationType.SUBJECT, request.subjectName(), new ArrayList<>(participantIds),
                null, request.classId()));
    }

    public Conversation createConversation(CreateConversationRequest request) {
        if (request.type() == null
                || request.participantIds() == null
                || request.participantIds().isEmpty()
                || request.participantIds().stream().anyMatch(id -> id == null || id.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type and participantIds are required");
        }
        if (request.type() == ConversationType.PRIVATE
                && (request.participantIds().size() != 2 || new HashSet<>(request.participantIds()).size() != 2)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "private chats need 2 distinct participants");
        }
        if (request.type() != ConversationType.PRIVATE
                && (request.name() == null || request.name().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "group chats need a name");
        }

        // return the existing chat instead of creating a duplicate
        if (request.type() == ConversationType.PRIVATE) {
            String first = request.participantIds().get(0);
            String second = request.participantIds().get(1);
            for (Conversation existing : conversationRepository
                    .findByTypeAndParticipantIdsContaining(ConversationType.PRIVATE, first)) {
                if (existing.getParticipantIds().contains(second)) {
                    return existing;
                }
            }
        } else if (request.type() == ConversationType.BLOCK && request.blockId() != null) {
            Conversation existing = conversationRepository
                    .findFirstByTypeAndBlockId(ConversationType.BLOCK, request.blockId());
            if (existing != null) {
                return existing;
            }
        } else if (request.type() == ConversationType.SUBJECT && request.classId() != null) {
            Conversation existing = conversationRepository
                    .findFirstByTypeAndClassId(ConversationType.SUBJECT, request.classId());
            if (existing != null) {
                return existing;
            }
        }

        Conversation conversation = new Conversation(
                request.type(), request.name(), request.participantIds());
        conversation.setBlockId(request.blockId());
        conversation.setClassId(request.classId());
        conversation.setId(creationId(request));
        try {
            return conversationRepository.insert(conversation);
        } catch (DuplicateKeyException e) {
            // Another request created this chat after our lookup. Keep its data intact.
            return conversationRepository.findById(conversation.getId()).orElseThrow(() -> e);
        }
    }

    private String creationId(CreateConversationRequest request) {
        String key = switch (request.type()) {
            case PRIVATE -> "PRIVATE:" + request.participantIds().stream().sorted()
                    .map(id -> id.length() + ":" + id).collect(Collectors.joining());
            case BLOCK -> request.blockId() == null ? null : "BLOCK:" + request.blockId();
            case SUBJECT -> request.classId() == null ? null : "SUBJECT:" + request.classId();
        };
        if (key == null) return null;

        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            return "chat_" + HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
