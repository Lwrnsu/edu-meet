<?php

require_once __DIR__ . '/../services/PasswordResetService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class PasswordResetController
{
    private PasswordResetService $service;

    public function __construct(?PasswordResetService $service = null)
    {
        $this->service = $service ?? new PasswordResetService();
    }

    public function handle(string $method, ?int $id = null, ?int $userId = null): void
    {
        try {
            match (strtoupper($method)) {
                'GET' => $id === null ? $this->index($userId) : $this->show($id),
                'POST' => $this->store(),
                'PUT', 'PATCH' => $this->update($id),
                'DELETE' => $this->destroy($id),
                default => Response::error('Method not allowed', 405),
            };
        } catch (ApiException $e) {
            Response::error($e->getMessage(), $e->getCode() ?: 400, $e->getDetails());
        } catch (Throwable $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    private function index(?int $userId): void
    {
        Response::json($this->service->getAll($userId));
    }

    private function show(int $id): void
    {
        Response::json($this->service->getById($id));
    }

    private function store(): void
    {
        $payload = $this->readJsonBody();
        $row = $this->service->create($payload);
        Response::json($row, 201);
    }

    private function update(?int $id): void
    {
        if ($id === null) {
            Response::error('Password reset id is required', 400);
        }

        $payload = $this->readJsonBody();
        Response::json($this->service->update($id, $payload));
    }

    private function destroy(?int $id): void
    {
        if ($id === null) {
            Response::error('Password reset id is required', 400);
        }

        $this->service->delete($id);
        http_response_code(204);
        exit;
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
