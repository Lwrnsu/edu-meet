<?php

require_once __DIR__ . '/../services/SchoolService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class SchoolController
{
    private SchoolService $service;

    public function __construct(?SchoolService $service = null)
    {
        $this->service = $service ?? new SchoolService();
    }

    public function handle(string $method, ?int $id = null): void
    {
        try {
            match (strtoupper($method)) {
                'GET' => $id === null ? $this->index() : $this->show($id),
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

    private function index(): void
    {
        Response::json($this->service->getAll());
    }

    private function show(int $id): void
    {
        Response::json($this->service->getById($id));
    }

    private function store(): void
    {
        $payload = $this->readJsonBody();
        $school = $this->service->create($payload);
        Response::json($school, 201);
    }

    private function update(?int $id): void
    {
        if ($id === null) {
            Response::error('School id is required', 400);
        }

        $payload = $this->readJsonBody();
        Response::json($this->service->update($id, $payload));
    }

    private function destroy(?int $id): void
    {
        if ($id === null) {
            Response::error('School id is required', 400);
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
