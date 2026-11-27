package com.block_a.edu_meet.controllers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.block_a.edu_meet.dtos.ApiResponse;

@RestControllerAdvice(assignableTypes = {ConversationController.class, MessageController.class, GroupChatController.class, AttachmentController.class, ChatSessionController.class})
public class CommunicationApiResponseAdvice extends ResponseEntityExceptionHandler
        implements ResponseBodyAdvice<Object> {

    private static final Logger log = LoggerFactory.getLogger(CommunicationApiResponseAdvice.class);

    @Override
    public boolean supports(MethodParameter returnType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return !ApiResponse.class.isAssignableFrom(returnType.getParameterType());
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body instanceof Resource) return body;
        return new ApiResponse<>(true, HttpStatus.OK.value(), "OK", body);
    }

    @Override
    protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers,
                                                          HttpStatusCode status, WebRequest request) {
        String message = body instanceof ProblemDetail problem && problem.getDetail() != null
                ? problem.getDetail()
                : "Request failed";
        return ResponseEntity.status(status).headers(headers)
                .body(new ApiResponse<>(false, status.value(), message, null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpectedError(Exception exception) {
        log.error("Communication API request failed", exception);
        return ResponseEntity.internalServerError()
                .body(new ApiResponse<>(false, HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        "Internal Server Error", null));
    }
}
