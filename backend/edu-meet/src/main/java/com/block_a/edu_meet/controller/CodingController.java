package com.block_a.edu_meet.controller;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.security.AuthenticatedUser;
import com.block_a.edu_meet.service.CanonicalClassAccessService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CodingController {
        private static final int MAX_CODE_LENGTH = 32_768;

        @Value("${compiler.api.url}")
        private String apiUrl;
        @Value("${compiler.api.key}")
        private String apiKey;

        private final RestTemplate restTemplate = new RestTemplate();
        private final CanonicalClassAccessService classAccess;
        private final String phpCompilerUrl;

        private static final Map<String, String> LANGUAGE_MAP = new HashMap<>();

        public CodingController(
                        CanonicalClassAccessService classAccess,
                        @Value("${app.php.compiler-url:http://localhost:8000/php_edumeet/}") String phpCompilerUrl) {
                this.classAccess = classAccess;
                this.phpCompilerUrl = phpCompilerUrl.endsWith("/") ? phpCompilerUrl : phpCompilerUrl + "/";
        }

        static {

                LANGUAGE_MAP.put("java", "openjdk-25");
                LANGUAGE_MAP.put("python", "python-3.14");
                LANGUAGE_MAP.put("php", "php-8.5");
                LANGUAGE_MAP.put("sql", "sqlite-3");
                LANGUAGE_MAP.put("c", "gcc-15");
                LANGUAGE_MAP.put("c#", "dotnet-csharp-10");
                LANGUAGE_MAP.put("c++", "g++-15");
                LANGUAGE_MAP.put("bash", "bash-5.2");
                LANGUAGE_MAP.put("javascript", "nodejs-24");

        }

        // questions
        @GetMapping("/questions")
        public String getQuestions() {
                return restTemplate.getForObject(
                                phpCompilerUrl + "get_questions.php",
                                String.class);
        }

        @PostMapping("/question")
        public String addQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                phpCompilerUrl + "save_question.php",
                                request,
                                String.class);
        }

        @PostMapping("/question/edit")
        public String editQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                phpCompilerUrl + "edit_question.php",
                                request,
                                String.class);
        }

        @PostMapping("/question/delete")
        public String deleteQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                phpCompilerUrl + "delete_question.php",
                                request,
                                String.class);
        }

        // assigning
        @PostMapping("/assign")
        public String assignQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                phpCompilerUrl + "assign_question.php",
                                request,
                                String.class);
        }

        @GetMapping("/assigned-question")
        public String getAssignedQuestion() {

                return restTemplate.getForObject(
                                phpCompilerUrl + "get_assigned_question.php",
                                String.class);
        }

        // submitting
        @PostMapping("/submit")
        public String submitCode(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                phpCompilerUrl + "submit_code.php",
                                request,
                                String.class);
        }

        @GetMapping("/submissions")
        public String getSubmissions() {

                return restTemplate.getForObject(
                                phpCompilerUrl + "get_submissions.php",
                                String.class);
        }

        // grading
        @PostMapping("/grade")
        public String gradeSubmission(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                phpCompilerUrl + "grade_submission.php",
                                request,
                                String.class);
        }

        @GetMapping("/result/{studentName}")
        public String getResult(
                        @PathVariable String studentName) {

                return restTemplate.getForObject(
                                phpCompilerUrl + "get_student_result.php?studentName="
                                                + studentName,
                                String.class);
        }

        @GetMapping("/meeting-code/assignment")
        public String getMeetingAssignment(
                        @RequestParam Integer classId,
                        @RequestParam Integer blockId,
                        Authentication authentication) {
                requireMeetingMember(authentication, classId, blockId);
                try {
                        return restTemplate.getForObject(
                                        phpCompilerUrl + "get_assigned_question.php",
                                        String.class);
                } catch (RestClientException exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "The coding assignment service is unavailable",
                                        exception);
                }
        }

        @PostMapping("/meeting-code/run")
        public Map<String, String> runMeetingCode(
                        @RequestBody MeetingCodeRunRequest request,
                        Authentication authentication) {
                requireMeetingMember(authentication, request.classId(), request.blockId());
                validateCode(request.code());

                String compiler = LANGUAGE_MAP.get(
                                request.language() == null ? "" : request.language().trim().toLowerCase(Locale.ROOT));
                if (compiler == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported programming language");
                }
                if (apiUrl == null || apiUrl.isBlank() || apiKey == null || apiKey.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "The code execution service is not configured");
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiKey);
                Map<String, Object> payload = Map.of("compiler", compiler, "code", request.code());
                try {
                        Map<?, ?> response = restTemplate.postForObject(
                                        apiUrl,
                                        new HttpEntity<>(payload, headers),
                                        Map.class);
                        Object output = response == null ? null : response.get("output");
                        return Map.of("output", output == null ? "" : output.toString());
                } catch (HttpClientErrorException exception) {
                        return Map.of("output", exception.getResponseBodyAsString());
                } catch (RestClientException exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "The code execution service is unavailable",
                                        exception);
                }
        }

        @PostMapping("/meeting-code/submit")
        public String submitMeetingCode(
                        @RequestBody MeetingCodeSubmissionRequest request,
                        Authentication authentication) {
                AuthorizedRoom room = requireMeetingMember(authentication, request.classId(), request.blockId());
                if (room.role() != MeetingRole.STUDENT) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Only enrolled students can submit code");
                }
                validateCode(request.code());
                if (request.questionId() == null || request.questionId() <= 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid questionId is required");
                }

                AuthenticatedUser user = currentUser(authentication);
                String studentName = user.displayName() == null || user.displayName().isBlank()
                                ? Integer.toString(user.id())
                                : user.displayName();
                Map<String, Object> submission = Map.of(
                                "studentName", studentName,
                                "questionId", request.questionId(),
                                "code", request.code());
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                try {
                        return restTemplate.postForObject(
                                        phpCompilerUrl + "submit_code.php",
                                        new HttpEntity<>(submission, headers),
                                        String.class);
                } catch (RestClientException exception) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "The coding submission service is unavailable",
                                        exception);
                }
        }

        // running the code
        @PostMapping("/run")
        public Map<String, String> runCode(
                        @RequestBody Map<String, String> body) {

                try {

                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_JSON);

                        headers.set("Authorization", "Bearer " + apiKey);

                        String selectedLanguage = body.get("language");

                        String compiler = LANGUAGE_MAP.get(selectedLanguage);

                        Map<String, Object> payload = new HashMap<>();

                        payload.put("compiler", compiler);
                        payload.put("code", body.get("code"));

                        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

                        Map<String, Object> response = restTemplate.postForObject(
                                        apiUrl,
                                        request,
                                        Map.class);

                        Map<String, String> result = new HashMap<>();

                        result.put(
                                        "output",
                                        response.get("output").toString());

                        return result;

                } catch (HttpClientErrorException e) {

                        Map<String, String> error = new HashMap<>();

                        error.put(
                                        "output",
                                        e.getResponseBodyAsString());

                        return error;

                } catch (Exception e) {

                        Map<String, String> error = new HashMap<>();

                        error.put(
                                        "output",
                                        e.toString());

                        return error;
                }
        }

        private AuthorizedRoom requireMeetingMember(
                        Authentication authentication,
                        Integer classId,
                        Integer blockId) {
                AuthenticatedUser user = currentUser(authentication);
                if (classId == null || classId <= 0 || blockId == null || blockId <= 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Positive classId and blockId are required");
                }
                return classAccess.authorize(user, classId, blockId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.FORBIDDEN,
                                                "You are not authorized for this class section"));
        }

        private static AuthenticatedUser currentUser(Authentication authentication) {
                if (authentication == null
                                || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "A verified authenticated user is required");
                }
                return user;
        }

        private static void validateCode(String code) {
                if (code == null || code.isBlank()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code cannot be empty");
                }
                if (code.length() > MAX_CODE_LENGTH) {
                        throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Code exceeds the size limit");
                }
        }

        public record MeetingCodeRunRequest(Integer classId, Integer blockId, String language, String code) {
        }

        public record MeetingCodeSubmissionRequest(Integer classId, Integer blockId, Integer questionId, String code) {
        }
}