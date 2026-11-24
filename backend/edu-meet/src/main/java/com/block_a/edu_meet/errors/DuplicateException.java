package com.block_a.edu_meet.errors;

import org.springframework.http.HttpStatus;

public class DuplicateException extends ApiException {
    public DuplicateException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
