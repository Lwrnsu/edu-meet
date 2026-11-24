<?php

require_once __DIR__ . '/../models/ApiResponse.php';

abstract class BaseController {
    protected function ok(int $code, string $message, array $body = []): ApiResponse {
        return new ApiResponse(true, $code, $message, $body);
    }

    protected function fail(int $code, string $message, array $body = []): ApiResponse {
        return new ApiResponse(false, $code, $message, $body);
    }
}