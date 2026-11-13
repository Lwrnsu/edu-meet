<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class AuthController
{
    private AuthService $service;

    public function __construct(?AuthService $service = null)
    {
        $this->service = $service ?? new AuthService();
    }

    public function login(): void
    {
        $this->handlePost(fn(array $payload) => $this->service->login($payload));
    }

    public function refresh(): void
    {
        $this->handlePost(fn(array $payload) => $this->service->refresh($payload));
    }

    public function logout(): void
    {
        $this->handlePost(function (array $payload) {
            $this->service->logout($payload);

            return ['message' => 'Logged out'];
        });
    }

    private function handlePost(callable $action): void
    {
        try {
            if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
                Response::error('Method not allowed', 405);
            }

            $payload = $this->readJsonBody();
            Response::json($action($payload));
        } catch (ApiException $e) {
            Response::error($e->getMessage(), $e->getCode() ?: 400, $e->getDetails());
        } catch (Throwable $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    private function readJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new ApiException('Invalid JSON body', 400);
        }

        return $data;
    }
}
