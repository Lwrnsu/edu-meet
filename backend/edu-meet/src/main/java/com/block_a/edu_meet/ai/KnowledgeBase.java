package com.block_a.edu_meet.ai;

import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// A tiny in-memory help centre. The search is deliberately naive - swap
// search() for embeddings later without touching the tool or chat loop.
@Component
public class KnowledgeBase {

    public record Entry(String title, String text) {}

    private static final int DEFAULT_LIMIT = 3;

    private static final List<Entry> ENTRIES = List.of(
            new Entry(
                    "Creating an account",
                    "Students and teachers sign up at edu-meet.app with a school email address. "
                            + "Choose the Student or Teacher role during sign-up; the role decides which "
                            + "dashboards and permissions you get. A confirmation email is sent immediately."),
            new Entry(
                    "Scheduling a class meeting",
                    "Teachers schedule a meeting from the dashboard with New meeting. Pick a date, a "
                            + "start time, a duration and an optional passcode. Invitations are emailed to "
                            + "the whole class, and the meeting appears in every student's upcoming list."),
            new Entry(
                    "Joining a meeting",
                    "Join from the meeting link or by entering the meeting code on the dashboard. "
                            + "Students may join up to 10 minutes before the start time and can still join "
                            + "late; a teacher can lock the room to block late arrivals."),
            new Entry(
                    "Recordings",
                    "Teachers can start a recording during a meeting. Recordings are processed after the "
                            + "call and appear under Recordings within about 15 minutes. Students only see "
                            + "recordings the teacher has shared with the class."),
            new Entry(
                    "Resetting a password",
                    "Use Forgot password on the sign-in screen. EduMeet sends a one-time code (OTP) "
                            + "to the registered school email. Enter the code to set a new password. "
                            + "If the OTP is entered incorrectly 5 times, wait 10 minutes before trying "
                            + "again. Requesting too many OTPs within an hour triggers a 1-hour wait "
                            + "before another request. The reset code is valid for 60 minutes."),
            new Entry(
                    "Too many failed sign-in attempts",
                    "After 5 wrong password attempts, sign-in is locked for 15 minutes. Wait 15 "
                            + "minutes before trying again, or use Forgot password to reset the "
                            + "password. A successful sign-in clears the failed-attempt count."),
            new Entry(
                    "Troubleshooting audio and video",
                    "If camera or microphone access is blocked, allow it in the browser address bar and "
                            + "reload. Chrome, Edge and Firefox are supported. On school networks, ask IT to "
                            + "allow WebRTC traffic on UDP ports 3478 and 5349.")
    );

    public List<Entry> search(String query) {
        return search(query, DEFAULT_LIMIT);
    }

    // Scores each entry by how many query terms it contains, best first.
    // Terms of three characters or fewer are ignored as noise.
    public List<Entry> search(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        Set<String> terms = Arrays.stream(query.toLowerCase(Locale.ROOT).split("\\W+"))
                .filter(term -> term.length() > 2)
                .collect(Collectors.toSet());

        if (terms.isEmpty()) {
            return List.of();
        }

        return ENTRIES.stream()
                .map(entry -> Map.entry(entry, score(entry, terms)))
                .filter(scored -> scored.getValue() > 0)
                .sorted(Map.Entry.<Entry, Integer>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }

    private static int score(Entry entry, Set<String> terms) {
        String haystack = (entry.title() + " " + entry.text()).toLowerCase(Locale.ROOT);
        int score = 0;
        for (String term : terms) {
            if (haystack.contains(term)) {
                score++;
            }
        }
        return score;
    }
}