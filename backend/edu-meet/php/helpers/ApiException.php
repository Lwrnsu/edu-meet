<?php

class ApiException extends RuntimeException
{
    private mixed $details;

    public function __construct(string $message, int $code = 400, mixed $details = null)
    {
        parent::__construct($message, $code);
        $this->details = $details;
    }

    public function getDetails(): mixed
    {
        return $this->details;
    }
}
