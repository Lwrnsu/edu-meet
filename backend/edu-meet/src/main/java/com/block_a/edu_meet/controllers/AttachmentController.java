package com.block_a.edu_meet.controllers;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Instant;
import java.util.Locale;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.helpers.ChatIdentity;
import com.block_a.edu_meet.helpers.VideoAttachmentType;
import com.block_a.edu_meet.handlers.ChatHandler;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.MessageRepository;

@RestController
@RequestMapping("/api/conversations/{conversationId}/messages")
public class AttachmentController {

    private static final int MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
    private final ConversationAccess access;
    private final MessageRepository messages;
    private final ChatHandler chat;

    public AttachmentController(ConversationAccess access, MessageRepository messages, ChatHandler chat) {
        this.access = access;
        this.messages = messages;
        this.chat = chat;
    }

    @PostMapping(path = "/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Message sendAttachment(@PathVariable String conversationId,

                                  Principal principal, @RequestParam MultipartFile file,
                                  @RequestParam(defaultValue = "") String text) throws IOException {
        String actor = ChatIdentity.userId(principal);
        Conversation conversation = access.requireMember(conversationId, actor);
        String caption = text.strip();
        if (caption.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Caption must be at most 2000 characters");
        }
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a nonempty file");
        }
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "File must be 5 MB or smaller");
        }

        byte[] bytes = file.getBytes();
        String name = cleanName(file.getOriginalFilename());
        String contentType = uploadType(bytes, name, file.getContentType());
        Message message = new Message(conversationId, actor, caption, Instant.now());
        message.setAttachment(new Message.Attachment(name, contentType, bytes.length));
        message.setAttachmentBytes(bytes);
        Message saved = messages.save(message);
        chat.publishSavedMessage(conversation, saved);
        return saved;
    }

    @GetMapping("/{messageId}/attachment")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable String conversationId,
                                                       @PathVariable String messageId,

                                                       @RequestParam(defaultValue = "false") boolean inline,
                                                       @RequestHeader(value = HttpHeaders.RANGE, required = false) String range,
                                                       Principal principal) {
        access.requireMember(conversationId, ChatIdentity.userId(principal));
        Message message = messages.findByIdAndConversationId(messageId, conversationId)
                .filter(candidate -> candidate.getAttachment() != null && candidate.getAttachmentBytes() != null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment doesn't exist"));

        Message.Attachment attachment = message.getAttachment();
        byte[] bytes = message.getAttachmentBytes();
        var resource = new ByteArrayResource(bytes);
        if (range != null) {
            try {
                // MVC writes valid Resource ranges. Reject invalid ranges before passing it a body.
                if (range.isBlank()) throw new IllegalArgumentException("Empty Range header");
                HttpRange.toResourceRegions(HttpRange.parseRanges(range), resource);
            } catch (IllegalArgumentException invalidRange) {
                return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                        .cacheControl(CacheControl.noStore())
                        .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                        .header(HttpHeaders.CONTENT_RANGE, "bytes */" + bytes.length)
                        .build();
            }
        }
        String contentType = attachment.contentType();
        if (MediaType.APPLICATION_OCTET_STREAM_VALUE.equals(contentType)) {
            String videoType = VideoAttachmentType.detect(bytes);
            if (videoType != null) contentType = videoType;
        }
        boolean showInline = inline && !MediaType.APPLICATION_OCTET_STREAM_VALUE.equals(contentType);
        var disposition = showInline ? ContentDisposition.inline() : ContentDisposition.attachment();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .headers(headers -> headers.setContentDisposition(
                        disposition.filename(attachment.name(), StandardCharsets.UTF_8).build()))
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    private static String uploadType(byte[] bytes, String name, String declaredType) {
        String videoType = VideoAttachmentType.detect(bytes);
        String lowerName = name.toLowerCase(Locale.ROOT);
        String mime = declaredType == null ? "" : declaredType.split(";", 2)[0].strip();
        boolean claimsMp4 = lowerName.endsWith(".mp4") || "video/mp4".equalsIgnoreCase(mime);
        boolean claimsWebm = lowerName.endsWith(".webm") || "video/webm".equalsIgnoreCase(mime);
        if ((claimsMp4 && !"video/mp4".equals(videoType)) || (claimsWebm && !"video/webm".equals(videoType))) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Invalid MP4 or WebM video");
        }
        return videoType == null ? imageType(bytes) : videoType;
    }

    private static String cleanName(String original) {
        if (original == null) return "attachment";
        String path = original.replace('\\', '/');
        String name = path.substring(path.lastIndexOf('/') + 1).replaceAll("\\p{C}", "").strip();
        if (name.isEmpty() || name.equals(".") || name.equals("..")) return "attachment";
        return name.substring(0, name.offsetByCodePoints(0, Math.min(160, name.codePointCount(0, name.length()))));
    }

    private static String imageType(byte[] bytes) {
        if (hasBytes(bytes, 0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
        if (hasBytes(bytes, 0, 0xff, 0xd8, 0xff)) return "image/jpeg";
        if (hasBytes(bytes, 0, 'G', 'I', 'F', '8', '7', 'a')
                || hasBytes(bytes, 0, 'G', 'I', 'F', '8', '9', 'a')) return "image/gif";
        if (hasBytes(bytes, 0, 'R', 'I', 'F', 'F') && hasBytes(bytes, 8, 'W', 'E', 'B', 'P')) return "image/webp";
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    private static boolean hasBytes(byte[] bytes, int offset, int... prefix) {
        if (bytes.length < offset + prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (Byte.toUnsignedInt(bytes[offset + i]) != prefix[i]) return false;
        }
        return true;
    }
}
