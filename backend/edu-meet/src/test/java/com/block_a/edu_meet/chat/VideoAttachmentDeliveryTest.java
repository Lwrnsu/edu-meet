package com.block_a.edu_meet.chat;

import static com.block_a.edu_meet.support.ChatTestPrincipals.account;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.block_a.edu_meet.controllers.AttachmentController;
import com.block_a.edu_meet.controllers.CommunicationApiResponseAdvice;
import com.block_a.edu_meet.dao.ConversationAccess;
import com.block_a.edu_meet.handlers.ChatHandler;
import com.block_a.edu_meet.models.Conversation;
import com.block_a.edu_meet.models.ConversationType;
import com.block_a.edu_meet.models.Message;
import com.block_a.edu_meet.repositories.ConversationRepository;
import com.block_a.edu_meet.repositories.MessageRepository;

class VideoAttachmentDeliveryTest {
    private static final String PATH = "/api/conversations/chat/messages";
    private static final String DOWNLOAD = PATH + "/file/attachment";
    private static final String OCTET = "application/octet-stream";
    private static final HexFormat HEX = HexFormat.of();
    private static final byte[] MP4 = HEX.parseHex(
            "000000106674797069736f6d00000000"
            + "0000002c6d6f6f76000000247472616b0000001c6d6469610000001468646c72000000000000000076696465"
            + "0000000c6d64617401020304");
    private static final byte[] WEBM = HEX.parseHex(
            "1a45dfa3874282847765626d18538067ff1654ae6b85ae838381011f43b67586e78100a38100");
    private final ConversationRepository conversations = mock(ConversationRepository.class);
    private final MessageRepository messages = mock(MessageRepository.class);
    private final ChatHandler chat = mock(ChatHandler.class);
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        var conversation = new Conversation(ConversationType.PRIVATE, null, List.of("php:1", "php:2"));
        when(conversations.findById("chat")).thenReturn(Optional.of(conversation));
        mvc = MockMvcBuilders.standaloneSetup(new AttachmentController(new ConversationAccess(conversations), messages, chat))
                .setControllerAdvice(new CommunicationApiResponseAdvice()).build();
    }

    @Test
    void storesVerifiedVideoTypesAndRetainsExistingFileHandling() throws Exception {
        when(messages.save(any(Message.class))).thenAnswer(call -> call.getArgument(0));
        assertUpload("clip.mp4", OCTET, MP4, "video/mp4");
        assertUpload("clip.webm", OCTET, WEBM, "video/webm");
        assertUpload("clip.bin", OCTET, WEBM, "video/webm");
        assertUpload("image.png", OCTET, HEX.parseHex("89504e470d0a1a0a"), "image/png");
        assertUpload("image.gif", OCTET, "GIF89a".getBytes(StandardCharsets.US_ASCII), "image/gif");
        assertUpload("file.pdf", "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII), OCTET);
        assertUpload("file.doc", "application/msword", new byte[5 * 1024 * 1024], OCTET);
    }

    @Test
    void rejectsMismatchedAndTruncatedVideosAndOversizedUploads() throws Exception {
        mvc.perform(upload("spoof.mp4", "video/mp4", WEBM)).andExpect(status().isUnsupportedMediaType());
        mvc.perform(upload("spoof.bin", "video/mp4; codecs=avc1", new byte[] {1}))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(upload("truncated.mp4", OCTET, Arrays.copyOf(MP4, MP4.length - 1)))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(upload("truncated.webm", OCTET, Arrays.copyOf(WEBM, WEBM.length - 1)))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(upload("large.webm", OCTET, new byte[5 * 1024 * 1024 + 1]))
                .andExpect(status().isPayloadTooLarge());
        mvc.perform(upload("empty.mp4", OCTET, new byte[0])).andExpect(status().isBadRequest());
        verifyNoInteractions(messages, chat);
    }

    @Test
    void servesLegacyVideoInlineAndAsDownloadWithValidByteRanges() throws Exception {
        storedFile("legacy.webm", OCTET, WEBM);
        mvc.perform(get(DOWNLOAD).principal(account(2)).param("inline", "true"))
                .andExpect(status().isOk()).andExpect(content().contentType("video/webm"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, startsWith("inline;")))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes")).andExpect(content().bytes(WEBM));
        mvc.perform(get(DOWNLOAD).principal(account(2)).header(HttpHeaders.RANGE, "bytes=1-3"))
                .andExpect(status().isPartialContent()).andExpect(content().contentType("video/webm"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, startsWith("attachment;")))
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 1-3/" + WEBM.length))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "3"))
                .andExpect(content().bytes(Arrays.copyOfRange(WEBM, 1, 4)));
        mvc.perform(get(DOWNLOAD).principal(account(2)).param("inline", "true").header(HttpHeaders.RANGE, "bytes=-3"))
                .andExpect(status().isPartialContent())
                .andExpect(content().bytes(Arrays.copyOfRange(WEBM, WEBM.length - 3, WEBM.length)));
        for (String range : List.of("bytes=9999-", "bad")) {
            mvc.perform(get(DOWNLOAD).principal(account(2)).header(HttpHeaders.RANGE, range))
                    .andExpect(status().isRequestedRangeNotSatisfiable())
                    .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes */" + WEBM.length))
                    .andExpect(content().bytes(new byte[0]));
        }
    }

    @Test
    void authorizesBeforeReturningBytesAndLeavesInvalidLegacyFilesAsDownloads() throws Exception {
        mvc.perform(get(DOWNLOAD).header(HttpHeaders.RANGE, "bytes=0-1"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(DOWNLOAD).principal(account(3)).header(HttpHeaders.RANGE, "bytes=0-1"))
                .andExpect(status().isNotFound());
        mvc.perform(get(PATH + "/foreign/attachment").principal(account(2))).andExpect(status().isNotFound());
        byte[] bytes = "not video".getBytes(StandardCharsets.US_ASCII);
        storedFile("legacy.mp4", OCTET, bytes);
        mvc.perform(get(DOWNLOAD).principal(account(2)).param("inline", "true"))
                .andExpect(status().isOk()).andExpect(content().contentType(OCTET))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, startsWith("attachment;")))
                .andExpect(content().bytes(bytes));
    }

    private void assertUpload(String name, String declared, byte[] bytes, String expected) throws Exception {
        mvc.perform(upload(name, declared, bytes)).andExpect(status().isOk())
                .andExpect(jsonPath("$.body.attachment.contentType").value(expected))
                .andExpect(jsonPath("$.body.attachmentBytes").doesNotExist());
    }

    private org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder upload(
            String name, String declared, byte[] bytes) {
        var request = multipart(PATH + "/attachments").file(new MockMultipartFile("file", name, declared, bytes));
        request.principal(account(1));
        return request;
    }

    private void storedFile(String name, String mime, byte[] bytes) {
        var message = new Message("chat", "php:1", "", Instant.EPOCH);
        message.setAttachment(new Message.Attachment(name, mime, bytes.length));
        message.setAttachmentBytes(bytes);
        when(messages.findByIdAndConversationId("file", "chat")).thenReturn(Optional.of(message));
    }
}
