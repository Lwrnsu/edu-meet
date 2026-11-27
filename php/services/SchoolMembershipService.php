<?php

require_once __DIR__ . '/../repositories/SchoolMembershipRepository.php';
require_once __DIR__ . '/../repositories/SchoolRepository.php';
require_once __DIR__ . '/../repositories/DepartmentRepository.php';
require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../repositories/RoleRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class SchoolMembershipService
{
    private SchoolMembershipRepository $repository;
    private SchoolRepository $schoolRepository;
    private DepartmentRepository $departmentRepository;
    private UserRepository $userRepository;
    private RoleRepository $roleRepository;

    public function __construct(
        ?SchoolMembershipRepository $repository = null,
        ?SchoolRepository $schoolRepository = null,
        ?DepartmentRepository $departmentRepository = null,
        ?UserRepository $userRepository = null,
        ?RoleRepository $roleRepository = null
    ) {
        $this->repository = $repository ?? new SchoolMembershipRepository();
        $this->schoolRepository = $schoolRepository ?? new SchoolRepository();
        $this->departmentRepository = $departmentRepository ?? new DepartmentRepository();
        $this->userRepository = $userRepository ?? new UserRepository();
        $this->roleRepository = $roleRepository ?? new RoleRepository();
    }

    public function getAll(?int $schoolId = null, ?int $userId = null, ?int $departmentId = null): array
    {
        $filters = array_filter(
            ['school_id' => $schoolId, 'user_id' => $userId, 'department_id' => $departmentId],
            static fn ($value) => $value !== null
        );

        if (count($filters) > 1) {
            throw new ApiException('Provide only one of school_id, user_id, or department_id', 400);
        }

        if ($schoolId !== null) {
            $this->assertSchoolExists($schoolId);
            $rows = $this->repository->findBySchoolId($schoolId);
        } elseif ($userId !== null) {
            $this->assertUserExists($userId);
            $rows = $this->repository->findByUserId($userId);
        } elseif ($departmentId !== null) {
            $this->assertDepartmentExists($departmentId);
            $rows = $this->repository->findByDepartmentId($departmentId);
        } else {
            $rows = $this->repository->findAll();
        }

        return array_map([$this, 'toPublic'], $rows);
    }

    public function getById(int $id): array
    {
        $row = $this->repository->findById($id);
        if ($row === null) {
            throw new ApiException('School membership not found', 404);
        }

        return $this->toPublic($row);
    }

    public function create(array $payload): array
    {
        $schoolId = $this->parsePositiveInt($payload['school_id'] ?? null, 'school_id');
        $userId = $this->parsePositiveInt($payload['user_id'] ?? null, 'user_id');
        $roleId = $this->parsePositiveInt($payload['role_id'] ?? null, 'role_id');
        $departmentId = $this->parseOptionalDepartmentId($payload['department_id'] ?? null);
        $statusRaw = $payload['status'] ?? 1;

        try {
            $status = $this->parseStatus($statusRaw);
        } catch (InvalidArgumentException $e) {
            throw new ApiException('Validation failed', 422, ['status' => $e->getMessage()]);
        }

        $this->assertSchoolExists($schoolId);
        $this->assertUserExists($userId);
        $this->assertRoleExists($roleId);
        $this->assertDepartmentBelongsToSchool($departmentId, $schoolId);

        if ($this->repository->exists($schoolId, $userId)) {
            throw new ApiException('User is already a member of this school', 409, [
                'school_id' => $schoolId,
                'user_id' => $userId,
            ]);
        }

        $id = $this->repository->create([
            'school_id' => $schoolId,
            'department_id' => $departmentId,
            'user_id' => $userId,
            'role_id' => $roleId,
            'status' => $status,
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('School membership not found', 404);
        }

        $roleId = array_key_exists('role_id', $payload)
            ? $this->parsePositiveInt($payload['role_id'], 'role_id')
            : (int) $existing['role_id'];

        $departmentId = array_key_exists('department_id', $payload)
            ? $this->parseOptionalDepartmentId($payload['department_id'])
            : ($existing['department_id'] !== null ? (int) $existing['department_id'] : null);

        $statusRaw = $payload['status'] ?? $existing['status'];
        try {
            $status = $this->parseStatus($statusRaw);
        } catch (InvalidArgumentException $e) {
            throw new ApiException('Validation failed', 422, ['status' => $e->getMessage()]);
        }

        $this->assertRoleExists($roleId);
        $this->assertDepartmentBelongsToSchool($departmentId, (int) $existing['school_id']);

        $this->repository->update($id, [
            'department_id' => $departmentId,
            'role_id' => $roleId,
            'status' => $status,
        ]);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->softDelete($id)) {
            throw new ApiException('School membership not found', 404);
        }
    }

    private function parseOptionalDepartmentId(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->parsePositiveInt($value, 'department_id');
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

    private function assertSchoolExists(int $schoolId): void
    {
        if ($this->schoolRepository->findById($schoolId) === null) {
            throw new ApiException('School not found', 404);
        }
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

    private function assertDepartmentExists(int $departmentId): void
    {
        if ($this->departmentRepository->findById($departmentId) === null) {
            throw new ApiException('Department not found', 404);
        }
    }

    private function assertDepartmentBelongsToSchool(?int $departmentId, int $schoolId): void
    {
        if ($departmentId === null) {
            return;
        }

        $department = $this->departmentRepository->findById($departmentId);
        if ($department === null) {
            throw new ApiException('Department not found', 404);
        }

        if ((int) $department['school_id'] !== $schoolId) {
            throw new ApiException('Validation failed', 422, [
                'department_id' => 'Department does not belong to this school',
            ]);
        }
    }

    private function toPublic(array $row): array
    {
        return [
            'membership_id' => (int) $row['membership_id'],
            'school_id' => (int) $row['school_id'],
            'school_name' => $row['school_name'],
            'department_id' => $row['department_id'] !== null ? (int) $row['department_id'] : null,
            'department_name' => $row['department_name'] ?? null,
            'department_slug' => $row['department_slug'] ?? null,
            'user_id' => (int) $row['user_id'],
            'role_id' => (int) $row['role_id'],
            'role_name' => $row['role_name'],
            'status' => (int) $row['status'],
            'joined_at' => $row['joined_at'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}
