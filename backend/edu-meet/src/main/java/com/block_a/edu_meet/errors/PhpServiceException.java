package com.block_a.edu_meet.errors;

import org.springframework.http.HttpStatus;

public class PhpServiceException extends ApiException {
    public PhpServiceException(String message) {
        super(HttpStatus.BAD_GATEWAY, message);
    }

    public PhpServiceException(String message, Throwable cause) {
        super(HttpStatus.BAD_GATEWAY, message, cause);
    }
}
