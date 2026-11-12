<?php

require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class UserService
{
    private UserRepository $repository;

    public function __construct(?UserRepository $repository = null)
    {
        $this->repository = $repository ?? new UserRepository();
    }

    public function getAll(): array
    {
        return array_map([$this, 'toPublic'], $this->repository->findAll());
    }

    public function getById(int $id): array
    {
        $user = $this->repository->findById($id);
        if ($user === null) {
            throw new ApiException('User not found', 404);
        }

        return $this->toPublic($user);
    }

    public function create(array $payload): array
    {
        $data = $this->validate($payload, true);

        if ($this->repository->emailExists($data['email'])) {
            throw new ApiException('Email already in use', 409);
        }

        $id = $this->repository->create([
            'email' => $data['email'],
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'status' => $data['status'],
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('User not found', 404);
        }

        $data = $this->validate($payload, false, $existing);

        if ($this->repository->emailExists($data['email'], $id)) {
            throw new ApiException('Email already in use', 409);
        }

        $update = [
            'email' => $data['email'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'status' => $data['status'],
        ];

        if (!empty($data['password'])) {
            $update['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        $this->repository->update($id, $update);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->softDelete($id)) {
            throw new ApiException('User not found', 404);
        }
    }

    private function validate(array $payload, bool $creating, ?array $existing = null): array
    {
        $errors = [];

        $email = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : '';
        $firstName = isset($payload['first_name']) ? trim((string) $payload['first_name']) : '';
        $lastName = isset($payload['last_name']) ? trim((string) $payload['last_name']) : '';
        $password = isset($payload['password']) ? (string) $payload['password'] : null;
        $statusRaw = $payload['status'] ?? ($creating ? 1 : ($existing['status'] ?? 1));

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email is required';
        } elseif (strlen($email) > 255) {
            $errors['email'] = 'Email must be at most 255 characters';
        }

        if ($firstName === '') {
            $errors['first_name'] = 'First name is required';
        } elseif (strlen($firstName) > 100) {
            $errors['first_name'] = 'First name must be at most 100 characters';
        }

        if ($lastName === '') {
            $errors['last_name'] = 'Last name is required';
        } elseif (strlen($lastName) > 100) {
            $errors['last_name'] = 'Last name must be at most 100 characters';
        }

        if ($creating) {
            if ($password === null || trim($password) === '') {
                $errors['password'] = 'Password is required';
            } elseif (strlen($password) < 6) {
                $errors['password'] = 'Password must be at least 6 characters';
            }
        } elseif ($password !== null && $password !== '' && strlen($password) < 6) {
            $errors['password'] = 'Password must be at least 6 characters';
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
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'password' => $password,
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

    private function toPublic(array $user): array
    {
        return [
            'user_id' => (int) $user['user_id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'status' => (int) $user['status'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
        ];
    }
}
