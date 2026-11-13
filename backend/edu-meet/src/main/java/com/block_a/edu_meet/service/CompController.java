package com.block_a.edu_meet.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import com.block_a.edu_meet.reqrep.CompQuestions;
import com.block_a.edu_meet.reqrep.CompRequest;
import com.block_a.edu_meet.reqrep.CompResponse;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/compiler")
@CrossOrigin(origins = "*")
public class CompController {
    @Value("${compiler.api.url}")
    private String apiUrl;
    @Value("${compiler.api.key}")
    private String apiKey;
    @Value("${php.questions.url}")
    private String phpquestionsUrl;

    @Value("${php.save.url}")
    private String phpSaveUrl;
    @Value("${php.edit.url}")
    private String phpEditUrl;
    @Value("${php.delete.url}")
    private String phpDeleteUrl;
    @Value("${php.secret}")
    private String phpSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, String> LANGUAGE_MAP =  new HashMap<>();
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
    @GetMapping("/questions")
    public ResponseEntity<List<CompQuestions>> getQuestion() {
        try {
            ResponseEntity<CompQuestions[]> response = restTemplate.getForEntity(
                    phpquestionsUrl,
                    CompQuestions[].class
            );
            CompQuestions[] body = response.getBody();
            if (body == null) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).body(null);
            }

            List<CompQuestions> questions = Arrays.asList(response.getBody());
            return ResponseEntity.ok(questions);

        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Failed to get questions from php: " +e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    private HttpEntity<Map<String, Object>> phpEntity(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Api-Secret", phpSecret);
        return new HttpEntity<>(body, headers);
    }

    @PostMapping("/questions")
    public ResponseEntity<String> addQuestion(@RequestBody CompQuestions q) {
        if (q.getQuestion() == null || q.getQuestion().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            String reply = restTemplate.postForObject(
                    phpSaveUrl,
                    phpEntity(Map.of("question", q.getQuestion().trim())),
                    String.class);
            System.out.println("PHP save replied: " + reply);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .contentType(MediaType.APPLICATION_JSON).body(reply);
        } catch (HttpStatusCodeException e) {
            System.err.println("PHP save error " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).build();
        } catch (Exception e) {
            System.err.println("Failed to save question via php: " + e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @PutMapping("/questions/{id}")
    public ResponseEntity<String> editQuestion(@PathVariable int id,
                                               @RequestBody CompQuestions q) {
        if (q.getQuestion() == null || q.getQuestion().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            String reply = restTemplate.postForObject(
                    phpEditUrl,
                    phpEntity(Map.of("id", id, "question", q.getQuestion().trim())),
                    String.class);
            System.out.println("PHP edit replied: " + reply);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(reply);
        } catch (HttpStatusCodeException e) {
            System.err.println("PHP edit error " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).build();
        } catch (Exception e) {
            System.err.println("Failed to edit question via php: " + e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable int id) {
        try {
            restTemplate.postForObject(phpDeleteUrl, phpEntity(Map.of("id", id)), String.class);
            return ResponseEntity.noContent().build();
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).build();
        } catch (Exception e) {
            System.err.println("Failed to delete question via php: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
    @PostMapping("/run")
    public ResponseEntity<CompResponse> runCode(@RequestBody CompRequest request) {
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            return fail(HttpStatus.BAD_REQUEST, "Please write some code first");
        }
        if (apiKey == null || apiKey.isBlank()) {
            return fail(HttpStatus.INTERNAL_SERVER_ERROR, "No API key set on the server");
        }
        String userLang = request.getLanguage();
        if (userLang == null || userLang.trim().isEmpty()) {
            return fail(HttpStatus.BAD_REQUEST, "Please select a programming language.");
        }
        String mappedLang = LANGUAGE_MAP.get(userLang.toLowerCase().trim());
        if (mappedLang == null) {
            return fail(HttpStatus.BAD_REQUEST, "Unsupported programming language.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", apiKey.trim());          // no "Bearer"

            Map<String, String> body = new HashMap<>();           // what the API expects
            body.put("compiler", mappedLang);
            body.put("code", request.getCode());
            body.put("input", request.getInput() == null ? "" : request.getInput());

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<CompResponse> response = restTemplate.exchange(
                    apiUrl, HttpMethod.POST, entity, CompResponse.class);
            return ResponseEntity.ok(response.getBody());

        } catch (HttpStatusCodeException e) {
            return fail(HttpStatus.BAD_GATEWAY, "OnlineCompiler.io answered "
                    + e.getStatusCode().value() + ": " + e.getResponseBodyAsString());
        } catch (Exception e) {
            return fail(HttpStatus.BAD_GATEWAY, "Could not reach OnlineCompiler.io: " + e.getMessage());
        }
    }
    private ResponseEntity<CompResponse> fail(HttpStatus status, String message) {
        CompResponse r = new CompResponse();
        r.setError(message);
        return ResponseEntity.status(status).body(r);
    }
}