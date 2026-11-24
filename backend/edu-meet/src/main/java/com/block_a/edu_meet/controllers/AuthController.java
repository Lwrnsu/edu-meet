package com.block_a.edu_meet.controllers;

import com.block_a.edu_meet.models.ApiResponse;
import com.block_a.edu_meet.models.Dean;
import com.block_a.edu_meet.models.FacultyWithUser;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.models.LogInRequest;
import com.block_a.edu_meet.models.ProgramChair;
import com.block_a.edu_meet.models.SchoolSignUp;
import com.block_a.edu_meet.models.StudentWithUser;
import com.block_a.edu_meet.services.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/logIn/manual")
    public ResponseEntity<ApiResponse> logInManual(@RequestBody LogInRequest logInRequest) {
        return loggedIn(AuthService.logIn(logInRequest));
    }

    @PostMapping("/schoolAdminLogIn")
    public ResponseEntity<ApiResponse> schoolAdminLogIn(@RequestBody LogInRequest logInRequest) {
        return loggedIn(AuthService.schoolAdminLogIn(logInRequest));
    }

    @PostMapping("/systemAdminLogin")
    public ResponseEntity<ApiResponse> systemAdminLogIn(@RequestBody LogInRequest logInRequest) {
        return loggedIn(AuthService.systemAdminLogIn(logInRequest));
    }

    @GetMapping("/logIn/cached")
    public ResponseEntity<ApiResponse> logInCached(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationToken) {

        LogInModel authBody = AuthService.logIn(authorizationToken);

        if (authBody == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Session expired or invalid token."));
        }
        return ResponseEntity.ok(new ApiResponse(true, "Login successful.", authBody));
    }

    @PostMapping("/logOut")
    public ResponseEntity<ApiResponse> logOut(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationToken) {

        AuthService.logOut(authorizationToken);
        return ok("Logged out.");
    }

    @PostMapping("/signUp")
    public ResponseEntity<ApiResponse> signUp(@RequestBody SchoolSignUp schoolSignUp) {
        AuthService.signUp(schoolSignUp);
        return ok("Sign up submitted. Your school is pending approval.");
    }

    @PostMapping("/add/student")
    public ResponseEntity<ApiResponse> addStudent(@RequestBody StudentWithUser body) {
        AuthService.createUser(body.user(), body.student());
        return ok("Student created.");
    }

    @GetMapping("/get/student")
    public ResponseEntity<ApiResponse> getStudent(@RequestParam Long userId) {
        return ok("Student found.", AuthService.getStudent(userId));
    }

    @PutMapping("/put/student")
    public ResponseEntity<ApiResponse> updateStudent(@RequestBody StudentWithUser body) {
        AuthService.updateUser(body.user(), body.student());
        return ok("Student updated.");
    }

    @DeleteMapping("/delete/student")
    public ResponseEntity<ApiResponse> deleteStudent(@RequestParam Long userId) {
        AuthService.deleteStudent(userId);
        return ok("Student deleted.");
    }

    @PostMapping("/add/faculty")
    public ResponseEntity<ApiResponse> addFaculty(@RequestBody FacultyWithUser body) {
        AuthService.createUser(body.user(), body.faculty());
        return ok("Faculty created.");
    }

    @GetMapping("/get/faculty")
    public ResponseEntity<ApiResponse> getFaculty(@RequestParam Long userId) {
        return ok("Faculty found.", AuthService.getFaculty(userId));
    }

    @PutMapping("/put/faculty")
    public ResponseEntity<ApiResponse> updateFaculty(@RequestBody FacultyWithUser body) {
        AuthService.updateUser(body.user(), body.faculty());
        return ok("Faculty updated.");
    }

    @DeleteMapping("/delete/faculty")
    public ResponseEntity<ApiResponse> deleteFaculty(@RequestParam Long userId) {
        AuthService.deleteFaculty(userId);
        return ok("Faculty deleted.");
    }

    @PostMapping("/add/programchair")
    public ResponseEntity<ApiResponse> addProgramChair(@RequestBody ProgramChair programChair) {
        AuthService.createProgramChair(programChair);
        return ok("Program chair created.");
    }

    @GetMapping("/get/programchair")
    public ResponseEntity<ApiResponse> getProgramChair(@RequestParam Long facultyUserId) {
        return ok("Program chair found.", AuthService.getProgramChair(facultyUserId));
    }

    @PutMapping("/put/programchair")
    public ResponseEntity<ApiResponse> updateProgramChair(@RequestBody ProgramChair programChair) {
        AuthService.updateProgramChair(programChair);
        return ok("Program chair updated.");
    }

    @DeleteMapping("/delete/programchair")
    public ResponseEntity<ApiResponse> deleteProgramChair(@RequestParam Long facultyUserId) {
        AuthService.deleteProgramChair(facultyUserId);
        return ok("Program chair deleted.");
    }

    @PostMapping("/add/dean")
    public ResponseEntity<ApiResponse> addDean(@RequestBody Dean dean) {
        AuthService.createDean(dean);
        return ok("Dean created.");
    }

    @GetMapping("/get/dean")
    public ResponseEntity<ApiResponse> getDean(@RequestParam Long facultyUserId) {
        return ok("Dean found.", AuthService.getDean(facultyUserId));
    }

    @PutMapping("/put/dean")
    public ResponseEntity<ApiResponse> updateDean(@RequestBody Dean dean) {
        AuthService.updateDean(dean);
        return ok("Dean updated.");
    }

    @DeleteMapping("/delete/dean")
    public ResponseEntity<ApiResponse> deleteDean(@RequestParam Long facultyUserId) {
        AuthService.deleteDean(facultyUserId);
        return ok("Dean deleted.");
    }

    private static ResponseEntity<ApiResponse> loggedIn(LogInModel authBody) {
        if (authBody == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid email or password."));
        }

        String authToken = AuthService.createAuthToken(authBody);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken)
                .body(new ApiResponse(true, "Login successful.", authBody));
    }

    private static ResponseEntity<ApiResponse> ok(String message) {
        return ResponseEntity.ok(new ApiResponse(true, message));
    }

    private static ResponseEntity<ApiResponse> ok(String message, Object body) {
        return ResponseEntity.ok(new ApiResponse(true, message, body));
    }
}

