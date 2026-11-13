<?php

require_once __DIR__ . '/../repositories/DepartmentRepository.php';
require_once __DIR__ . '/../repositories/SchoolRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class DepartmentService
{
    private DepartmentRepository $repository;
    private SchoolRepository $schoolRepository;

    public function __construct(
        ?DepartmentRepository $repository = null,
        ?SchoolRepository $schoolRepository = null
    ) {
        $this->repository = $repository ?? new DepartmentRepository();
        $this->schoolRepository = $schoolRepository ?? new SchoolRepository();
    }

    public function getAll(?int $schoolId = null): array
    {
        if ($schoolId !== null) {
            $this->assertSchoolExists($schoolId);
            $rows = $this->repository->findBySchoolId($schoolId);
        } else {
            $rows = $this->repository->findAll();
        }

        return array_map([$this, 'toPublic'], $rows);
    }

    public function getById(int $id): array
    {
        $row = $this->repository->findById($id);
        if ($row === null) {
            throw new ApiException('Department not found', 404);
        }

        return $this->toPublic($row);
    }

    public function create(array $payload): array
    {
        $data = $this->validate($payload, true);

        $this->assertSchoolExists($data['school_id']);

        if ($this->repository->slugExists($data['school_id'], $data['slug'])) {
            throw new ApiException('Department slug already in use', 409);
        }

        $id = $this->repository->create([
            'school_id' => $data['school_id'],
            'name' => $data['name'],
            'slug' => $data['slug'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('Department not found', 404);
        }

        $data = $this->validate($payload, false, $existing);

        $this->assertSchoolExists($data['school_id']);

        if ($this->repository->slugExists($data['school_id'], $data['slug'], $id)) {
            throw new ApiException('Department slug already in use', 409);
        }

        $this->repository->update($id, [
            'school_id' => $data['school_id'],
            'name' => $data['name'],
            'slug' => $data['slug'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->softDelete($id)) {
            throw new ApiException('Department not found', 404);
        }
    }

    private function validate(array $payload, bool $creating, ?array $existing = null): array
    {
        $errors = [];

        $schoolIdRaw = $payload['school_id'] ?? ($creating ? null : ($existing['school_id'] ?? null));
        $name = isset($payload['name'])
            ? trim((string) $payload['name'])
            : ($creating ? '' : (string) ($existing['name'] ?? ''));
        $slugRaw = array_key_exists('slug', $payload)
            ? $payload['slug']
            : ($creating ? null : ($existing['slug'] ?? null));
        $statusRaw = $payload['status'] ?? ($creating ? 1 : ($existing['status'] ?? 1));

        $schoolId = null;
        try {
            $schoolId = $this->parsePositiveInt($schoolIdRaw, 'school_id');
        } catch (ApiException $e) {
            $details = $e->getDetails();
            $errors['school_id'] = $details['school_id'] ?? 'School id must be a positive integer';
        }

        if ($name === '') {
            $errors['name'] = 'Name is required';
        } elseif (strlen($name) > 255) {
            $errors['name'] = 'Name must be at most 255 characters';
        }

        $slug = '';
        if ($slugRaw === null || $slugRaw === '') {
            $errors['slug'] = 'Slug is required';
        } else {
            $slug = strtoupper(trim((string) $slugRaw));
            if ($slug === '') {
                $errors['slug'] = 'Slug is required';
            } elseif (strlen($slug) > 32) {
                $errors['slug'] = 'Slug must be at most 32 characters';
            } elseif (!preg_match('/^[A-Z0-9]+$/', $slug)) {
                $errors['slug'] = 'Slug must contain only letters and digits (e.g. CCS, CBA)';
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
            'school_id' => $schoolId,
            'name' => $name,
            'slug' => $slug,
            'status' => $status,
        ];
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

    private function toPublic(array $row): array
    {
        return [
            'department_id' => (int) $row['department_id'],
            'school_id' => (int) $row['school_id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'status' => (int) $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}
