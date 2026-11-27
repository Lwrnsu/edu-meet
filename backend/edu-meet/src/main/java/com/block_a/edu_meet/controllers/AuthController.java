package com.block_a.edu_meet.controllers;

import com.block_a.edu_meet.models.ApiResponse;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.services.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("authTokenController")
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/logIn/cached")
    public ResponseEntity<ApiResponse> logInCached(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationToken) {
        LogInModel authBody = AuthService.logIn(authorizationToken);

        if (authBody == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Session expired or token is invalid"));
        }

        return ResponseEntity.ok().body(new ApiResponse(true, "Logged in from cache", authBody));
    }

    @PostMapping("/logOut")
    public ResponseEntity<ApiResponse> logOut(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationToken) {
        boolean removed = AuthService.logOut(authorizationToken);

        if (!removed) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Session expired or token is invalid"));
        }

        return ResponseEntity.ok().body(new ApiResponse(true, "Logged out"));
    }
}
