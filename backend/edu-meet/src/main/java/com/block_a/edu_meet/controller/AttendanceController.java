package com.block_a.edu_meet.controller;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.block_a.edu_meet.attendance.AttendanceService;
import com.block_a.edu_meet.attendance.AttendanceSummary;
import io.livekit.server.WebhookReceiver;
import livekit.LivekitWebhook.WebhookEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final WebhookReceiver webhookReceiver;
    private final AttendanceService attendanceService;
    private final String reportKey;

    public AttendanceController(
            @Value("${livekit.api-key}") String apiKey,
            @Value("${livekit.api-secret}") String apiSecret,
            @Value("${attendance.report-key:}") String reportKey,
            AttendanceService attendanceService) {
        this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret);
        this.attendanceService = attendanceService;
        this.reportKey = reportKey;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> receiveWebhook(
            @RequestBody String body,
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        WebhookEvent event;
        try {
            event = webhookReceiver.receive(body, authorization);
        } catch (JWTVerificationException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid LiveKit webhook authorization"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }

        try {
            attendanceService.process(event);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{roomName}")
    public ResponseEntity<?> getRoomAttendance(
            @PathVariable String roomName,
            @RequestHeader(name = "X-Attendance-Report-Key", required = false) String suppliedKey) {
        if (reportKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Attendance reports are disabled until ATTENDANCE_REPORT_KEY is configured"));
        }
        if (suppliedKey == null || !MessageDigest.isEqual(
                reportKey.getBytes(StandardCharsets.UTF_8),
                suppliedKey.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "A valid attendance report key is required"));
        }

        List<AttendanceSummary> summaries =
                attendanceService.getRoomAttendance(roomName, Instant.now());
        return ResponseEntity.ok(summaries);
    }
}
