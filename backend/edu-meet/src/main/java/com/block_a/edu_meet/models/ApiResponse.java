package com.block_a.edu_meet.models;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse {
    private boolean status;
    private String message;
    private Object body;

    public ApiResponse() {}

    public ApiResponse(boolean status, String message) {
        this(status, message, null);
    }

    public ApiResponse(boolean status, String message, Object body) {
        this.status = status;
        this.message = message;
        this.body = body;
    }

    public boolean isStatus() { return status; }
    public void setStatus(boolean status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Object getBody() { return body; }
    public void setBody(Object body) { this.body = body; }
}
