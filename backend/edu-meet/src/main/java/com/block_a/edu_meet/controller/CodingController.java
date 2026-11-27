package com.block_a.edu_meet.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CodingController {
        @Value("${compiler.api.url}")
        private String apiUrl;
        @Value("${compiler.api.key}")
        private String apiKey;

        private final RestTemplate restTemplate = new RestTemplate();

        private static final String PHP_URL = "http://127.0.0.1:8000/";
        private static final Map<String, String> LANGUAGE_MAP = new HashMap<>();

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
                                PHP_URL + "get_questions.php",
                                String.class);
        }

        @PostMapping("/question")
        public String addQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                PHP_URL + "save_question.php",
                                request,
                                String.class);
        }

        @PostMapping("/question/edit")
        public String editQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                PHP_URL + "edit_question.php",
                                request,
                                String.class);
        }

        @PostMapping("/question/delete")
        public String deleteQuestion(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                PHP_URL + "delete_question.php",
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
                                PHP_URL + "assign_question.php",
                                request,
                                String.class);
        }

        @GetMapping("/assigned-question")
        public String getAssignedQuestion() {

                return restTemplate.getForObject(
                                PHP_URL + "get_assigned_question.php",
                                String.class);
        }

        // submitting
        @PostMapping("/submit")
        public String submitCode(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                PHP_URL + "submit_code.php",
                                request,
                                String.class);
        }

        @GetMapping("/submissions")
        public String getSubmissions() {

                return restTemplate.getForObject(
                                PHP_URL + "get_submissions.php",
                                String.class);
        }

        // grading
        @PostMapping("/grade")
        public String gradeSubmission(@RequestBody String body) {

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> request = new HttpEntity<>(body, headers);

                return restTemplate.postForObject(
                                PHP_URL + "grade_submission.php",
                                request,
                                String.class);
        }

        @GetMapping("/result/{studentName}")
        public String getResult(
                        @PathVariable String studentName) {

                return restTemplate.getForObject(
                                PHP_URL + "get_student_result.php?studentName="
                                                + studentName,
                                String.class);
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
}