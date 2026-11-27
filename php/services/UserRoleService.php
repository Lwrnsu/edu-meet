<?php

require_once __DIR__ . '/../repositories/UserRoleRepository.php';
require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../repositories/RoleRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class UserRoleService
{
    private UserRoleRepository $repository;
    private UserRepository $userRepository;
    private RoleRepository $roleRepository;

    public function __construct(
        ?UserRoleRepository $repository = null,
        ?UserRepository $userRepository = null,
        ?RoleRepository $roleRepository = null
    ) {
        $this->repository = $repository ?? new UserRoleRepository();
        $this->userRepository = $userRepository ?? new UserRepository();
        $this->roleRepository = $roleRepository ?? new RoleRepository();
    }

    public function getAll(?int $userId = null): array
    {
        if ($userId !== null) {
            $this->assertUserExists($userId);
            $rows = $this->repository->findByUserId($userId);
        } else {
            $rows = $this->repository->findAll();
        }

        return array_map([$this, 'toPublic'], $rows);
    }

    public function getById(int $id): array
    {
        $row = $this->repository->findById($id);
        if ($row === null) {
            throw new ApiException('User role assignment not found', 404);
        }

        return $this->toPublic($row);
    }

    public function create(array $payload): array
    {
        $userId = $this->parsePositiveInt($payload['user_id'] ?? null, 'user_id');
        $roleIds = $this->normalizeRoleIds($payload);

        if ($roleIds === []) {
            throw new ApiException('Validation failed', 422, [
                'role_ids' => 'Provide role_id or a non-empty role_ids array',
            ]);
        }

        $this->assertUserExists($userId);

        $created = [];
        foreach ($roleIds as $roleId) {
            $this->assertRoleExists($roleId);

            if ($this->repository->exists($userId, $roleId)) {
                throw new ApiException('Role already assigned to this user', 409, [
                    'user_id' => $userId,
                    'role_id' => $roleId,
                ]);
            }

            $id = $this->repository->create($userId, $roleId);
            $created[] = $this->getById($id);
        }

        return $created;
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('User role assignment not found', 404);
        }

        $roleId = $this->parsePositiveInt($payload['role_id'] ?? null, 'role_id');
        $this->assertRoleExists($roleId);

        $userId = (int) $existing['user_id'];
        if ($this->repository->exists($userId, $roleId, $id)) {
            throw new ApiException('Role already assigned to this user', 409, [
                'user_id' => $userId,
                'role_id' => $roleId,
            ]);
        }

        $this->repository->update($id, $roleId);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->delete($id)) {
            throw new ApiException('User role assignment not found', 404);
        }
    }

    private function normalizeRoleIds(array $payload): array
    {
        if (array_key_exists('role_ids', $payload)) {
            if (!is_array($payload['role_ids'])) {
                throw new ApiException('Validation failed', 422, [
                    'role_ids' => 'role_ids must be an array of positive integers',
                ]);
            }

            $ids = [];
            foreach ($payload['role_ids'] as $value) {
                $ids[] = $this->parsePositiveInt($value, 'role_ids');
            }

            return array_values(array_unique($ids));
        }

        if (array_key_exists('role_id', $payload)) {
            return [$this->parsePositiveInt($payload['role_id'], 'role_id')];
        }

        return [];
    }

    private function parsePositiveInt(mixed $value, string $field): int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }

        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        throw new ApiException('Validation failed', 422, [
            $field => ucfirst(str_replace('_', ' ', $field)) . ' must be a positive integer',
        ]);
    }

    private function assertUserExists(int $userId): void
    {
        if ($this->userRepository->findById($userId) === null) {
            throw new ApiException('User not found', 404);
        }
    }

    private function assertRoleExists(int $roleId): void
    {
        if ($this->roleRepository->findById($roleId) === null) {
            throw new ApiException('Role not found', 404);
        }
    }

    private function toPublic(array $row): array
    {
        return [
            'user_role_id' => (int) $row['user_role_id'],
            'user_id' => (int) $row['user_id'],
            'role_id' => (int) $row['role_id'],
            'role_name' => $row['role_name'],
            'assigned_at' => $row['assigned_at'],
        ];
    }
}
