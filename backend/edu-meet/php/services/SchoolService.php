<?php

require_once __DIR__ . '/../repositories/SchoolRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class SchoolService
{
    private SchoolRepository $repository;

    public function __construct(?SchoolRepository $repository = null)
    {
        $this->repository = $repository ?? new SchoolRepository();
    }

    public function getAll(): array
    {
        return array_map([$this, 'toPublic'], $this->repository->findAll());
    }

    public function getById(int $id): array
    {
        $school = $this->repository->findById($id);
        if ($school === null) {
            throw new ApiException('School not found', 404);
        }

        return $this->toPublic($school);
    }

    public function create(array $payload): array
    {
        $data = $this->validate($payload, true);

        if ($this->repository->emailExists($data['email'])) {
            throw new ApiException('School email already in use', 409);
        }

        if ($data['slug'] !== null && $this->repository->slugExists($data['slug'])) {
            throw new ApiException('School slug already in use', 409);
        }

        $id = $this->repository->create([
            'name' => $data['name'],
            'location' => $data['location'],
            'email' => $data['email'],
            'slug' => $data['slug'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('School not found', 404);
        }

        $data = $this->validate($payload, false, $existing);

        if ($this->repository->emailExists($data['email'], $id)) {
            throw new ApiException('School email already in use', 409);
        }

        if ($data['slug'] !== null && $this->repository->slugExists($data['slug'], $id)) {
            throw new ApiException('School slug already in use', 409);
        }

        $this->repository->update($id, [
            'name' => $data['name'],
            'location' => $data['location'],
            'email' => $data['email'],
            'slug' => $data['slug'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->softDelete($id)) {
            throw new ApiException('School not found', 404);
        }
    }

    private function validate(array $payload, bool $creating, ?array $existing = null): array
    {
        $errors = [];

        $name = isset($payload['name'])
            ? trim((string) $payload['name'])
            : ($creating ? '' : (string) ($existing['name'] ?? ''));
        $location = isset($payload['location'])
            ? trim((string) $payload['location'])
            : ($creating ? '' : (string) ($existing['location'] ?? ''));
        $email = isset($payload['email'])
            ? strtolower(trim((string) $payload['email']))
            : ($creating ? '' : strtolower(trim((string) ($existing['email'] ?? ''))));

        $slugRaw = array_key_exists('slug', $payload)
            ? $payload['slug']
            : ($creating ? null : ($existing['slug'] ?? null));
        $statusRaw = $payload['status'] ?? ($creating ? 1 : ($existing['status'] ?? 1));

        if ($name === '') {
            $errors['name'] = 'Name is required';
        } elseif (strlen($name) > 128) {
            $errors['name'] = 'Name must be at most 128 characters';
        }

        if ($location === '') {
            $errors['location'] = 'Location is required';
        } elseif (strlen($location) > 255) {
            $errors['location'] = 'Location must be at most 255 characters';
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email is required';
        } elseif (strlen($email) > 255) {
            $errors['email'] = 'Email must be at most 255 characters';
        }

        $slug = null;
        if ($slugRaw !== null && $slugRaw !== '') {
            $slug = strtolower(trim((string) $slugRaw));
            if ($slug === '') {
                $slug = null;
            } elseif (strlen($slug) > 128) {
                $errors['slug'] = 'Slug must be at most 128 characters';
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
            'location' => $location,
            'email' => $email,
            'slug' => $slug,
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

    private function toPublic(array $school): array
    {
        return [
            'school_id' => (int) $school['school_id'],
            'name' => $school['name'],
            'location' => $school['location'],
            'email' => $school['email'],
            'slug' => $school['slug'],
            'status' => (int) $school['status'],
            'created_at' => $school['created_at'],
            'updated_at' => $school['updated_at'],
        ];
    }
}
