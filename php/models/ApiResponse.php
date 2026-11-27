<?php 
class ApiResponse {
    public bool $response;
    public int $code;
    public string $message;
    public array $body;

    public function __construct(bool $response, int $code, string $message, array $body) {
        $this->response = $response;
        $this->code = $code;
        $this->message = $message;
        $this->body = $body;
    }
}