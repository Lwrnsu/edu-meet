<?php

require_once __DIR__ . '/../repositories/RoleRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class RoleService
{
    private RoleRepository $repository;

    public function __construct(?RoleRepository $repository = null)
    {
        $this->repository = $repository ?? new RoleRepository();
    }

    public function getAll(): array
    {
        return array_map([$this, 'toPublic'], $this->repository->findAll());
    }

    public function getById(int $id): array
    {
        $role = $this->repository->findById($id);
        if ($role === null) {
            throw new ApiException('Role not found', 404);
        }

        return $this->toPublic($role);
    }

    public function create(array $payload): array
    {
        $data = $this->validate($payload, true);

        if ($this->repository->nameExists($data['name'])) {
            throw new ApiException('Role name already in use', 409);
        }

        $id = $this->repository->create([
            'name' => $data['name'],
            'description' => $data['description'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('Role not found', 404);
        }

        $data = $this->validate($payload, false, $existing);

        if ($this->repository->nameExists($data['name'], $id)) {
            throw new ApiException('Role name already in use', 409);
        }

        $this->repository->update($id, [
            'name' => $data['name'],
            'description' => $data['description'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->softDelete($id)) {
            throw new ApiException('Role not found', 404);
        }
    }

    private function validate(array $payload, bool $creating, ?array $existing = null): array
    {
        $errors = [];

        $name = isset($payload['name']) ? trim((string) $payload['name']) : '';
        $descriptionRaw = $payload['description'] ?? ($creating ? null : ($existing['description'] ?? null));
        $statusRaw = $payload['status'] ?? ($creating ? 1 : ($existing['status'] ?? 1));

        if ($name === '') {
            $errors['name'] = 'Name is required';
        } elseif (strlen($name) > 100) {
            $errors['name'] = 'Name must be at most 100 characters';
        }

        $description = null;
        if ($descriptionRaw !== null) {
            $description = trim((string) $descriptionRaw);
            if ($description === '') {
                $description = null;
            } elseif (strlen($description) > 255) {
                $errors['description'] = 'Description must be at most 255 characters';
            }
        }

        try {
            $status = $this->parseStatus($statusRaw);
        } catch (InvalidArgumentException $e) {
            $errors['status'] = $e->getMessage();
            $status = 1;
        }

        if (!empty($errors)) {
            throw new ApiException('Validation failed', 422, $errors);
        }

        return [
            'name' => $name,
            'description' => $description,
            'status' => $status,
        ];
    }

    private function parseStatus(mixed $status): int
    {
        if (is_bool($status)) {
            return $status ? 1 : 0;
        }

        if (is_int($status) || (is_string($status) && ctype_digit($status))) {
            $value = (int) $status;
            if ($value === 0 || $value === 1) {
                return $value;
            }
        }

        if (is_string($status)) {
            $normalized = strtolower(trim($status));
            if ($normalized === 'active') {
                return 1;
            }
            if ($normalized === 'inactive') {
                return 0;
            }
        }

        throw new InvalidArgumentException("Status must be 1, 0, 'active', or 'inactive'");
    }

    private function toPublic(array $role): array
    {
        return [
            'role_id' => (int) $role['role_id'],
            'name' => $role['name'],
            'description' => $role['description'],
            'status' => (int) $role['status'],
            'created_at' => $role['created_at'],
            'updated_at' => $role['updated_at'],
        ];
    }
}
