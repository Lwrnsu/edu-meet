<?php

require_once __DIR__ . '/../repositories/RefreshTokenRepository.php';
require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class RefreshTokenService
{
    private RefreshTokenRepository $repository;
    private UserRepository $userRepository;

    public function __construct(
        ?RefreshTokenRepository $repository = null,
        ?UserRepository $userRepository = null
    ) {
        $this->repository = $repository ?? new RefreshTokenRepository();
        $this->userRepository = $userRepository ?? new UserRepository();
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
            throw new ApiException('Refresh token not found', 404);
        }

        return $this->toPublic($row);
    }

    public function create(array $payload): array
    {
        $data = $this->validate($payload, true);
        $this->assertUserExists($data['user_id']);

        $id = $this->repository->create([
            'user_id' => $data['user_id'],
            'token_hash' => $data['token_hash'],
            'expires_at' => $data['expires_at'],
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $payload): array
    {
        $existing = $this->repository->findById($id);
        if ($existing === null) {
            throw new ApiException('Refresh token not found', 404);
        }

        $data = $this->validate($payload, false, $existing);
        $this->assertUserExists($data['user_id']);

        $this->repository->update($id, [
            'user_id' => $data['user_id'],
            'token_hash' => $data['token_hash'],
            'expires_at' => $data['expires_at'],
        ]);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repository->delete($id)) {
            throw new ApiException('Refresh token not found', 404);
        }
    }

    private function validate(array $payload, bool $creating, ?array $existing = null): array
    {
        $errors = [];

        $userIdRaw = $payload['user_id'] ?? ($creating ? null : ($existing['user_id'] ?? null));
        $tokenHash = isset($payload['token_hash'])
            ? trim((string) $payload['token_hash'])
            : ($creating ? '' : (string) ($existing['token_hash'] ?? ''));
        $expiresAtRaw = $payload['expires_at'] ?? ($creating ? null : ($existing['expires_at'] ?? null));

        $userId = null;
        try {
            $userId = $this->parsePositiveInt($userIdRaw, 'user_id');
        } catch (ApiException $e) {
            $details = $e->getDetails();
            $errors['user_id'] = $details['user_id'] ?? 'User id must be a positive integer';
        }

        if ($tokenHash === '') {
            $errors['token_hash'] = 'Token hash is required';
        } elseif (strlen($tokenHash) > 255) {
            $errors['token_hash'] = 'Token hash must be at most 255 characters';
        }

        $expiresAt = null;
        try {
            $expiresAt = $this->parseDateTime($expiresAtRaw);
        } catch (InvalidArgumentException $e) {
            $errors['expires_at'] = $e->getMessage();
        }

        if (!empty($errors)) {
            throw new ApiException('Validation failed', 422, $errors);
        }

        return [
            'user_id' => $userId,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
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

    private function parseDateTime(mixed $value): string
    {
        if (!is_string($value) || trim($value) === '') {
            throw new InvalidArgumentException('Expires at is required');
        }

        $raw = trim($value);
        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $raw);
        if ($dt instanceof DateTimeImmutable) {
            return $dt->format('Y-m-d H:i:s');
        }

        try {
            $dt = new DateTimeImmutable($raw);
        } catch (Exception $e) {
            throw new InvalidArgumentException('Expires at must be a valid datetime (Y-m-d H:i:s)');
        }

        return $dt->format('Y-m-d H:i:s');
    }

    private function assertUserExists(int $userId): void
    {
        if ($this->userRepository->findById($userId) === null) {
            throw new ApiException('User not found', 404);
        }
    }

    private function toPublic(array $row): array
    {
        return [
            'token_id' => (int) $row['token_id'],
            'user_id' => (int) $row['user_id'],
            'token_hash' => $row['token_hash'],
            'expires_at' => $row['expires_at'],
            'created_at' => $row['created_at'],
        ];
    }
}
