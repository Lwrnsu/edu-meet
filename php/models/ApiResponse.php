<?php

class ApiResponse implements JsonSerializable {
    public bool $response;
    public int $code;
    public string $message;
    public array $body;

    public function __construct(
        bool $response,
        int $code,
        string $message,
        array $body = []
    ) {
        $this->response = $response;
        $this->code = $code;
        $this->message = $message;
        $this->body = $body;
    }

    public function toArray(): array {
        return [
            'response' => $this->response,
            'code'     => $this->code,
            'message'  => $this->message,
            'body'     => $this->body,
        ];
    }

    public function jsonSerialize(): array {
        return $this->toArray();
    }
}