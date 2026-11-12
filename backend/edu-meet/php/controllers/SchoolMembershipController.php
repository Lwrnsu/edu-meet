<?php

require_once __DIR__ . '/../services/SchoolMembershipService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class SchoolMembershipController
{
    private SchoolMembershipService $service;

    public function __construct(?SchoolMembershipService $service = null)
    {
        $this->service = $service ?? new SchoolMembershipService();
    }

    public function handle(string $method, ?int $id = null, ?int $schoolId = null, ?int $userId = null): void
    {
        try {
            match (strtoupper($method)) {
                'GET' => $id === null ? $this->index($schoolId, $userId) : $this->show($id),
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

    private function index(?int $schoolId, ?int $userId): void
    {
        Response::json($this->service->getAll($schoolId, $userId));
    }

    private function show(int $id): void
    {
        Response::json($this->service->getById($id));
    }

    private function store(): void
    {
        $payload = $this->readJsonBody();
        $membership = $this->service->create($payload);
        Response::json($membership, 201);
    }

    private function update(?int $id): void
    {
        if ($id === null) {
            Response::error('Membership id is required', 400);
        }

        $payload = $this->readJsonBody();
        Response::json($this->service->update($id, $payload));
    }

    private function destroy(?int $id): void
    {
        if ($id === null) {
            Response::error('Membership id is required', 400);
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
