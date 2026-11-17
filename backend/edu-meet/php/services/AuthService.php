<?php

require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../repositories/UserRoleRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/JwtHelper.php';
require_once __DIR__ . '/../helpers/SessionStore.php';

class AuthService
{
    private UserRepository $repository;
    private UserRoleRepository $userRoleRepository;
    private SessionStore $store;
    private array $jwtConfig;

    public function __construct(
        ?UserRepository $repository = null,
        ?SessionStore $store = null,
        ?UserRoleRepository $userRoleRepository = null
    ) {
        $this->repository = $repository ?? new UserRepository();
        $this->userRoleRepository = $userRoleRepository ?? new UserRoleRepository();
        $this->store = $store ?? new SessionStore();
        $this->jwtConfig = require __DIR__ . '/../config/jwt.php';
    }

    public function login(array $payload): array
    {
        $user = $this->authenticateCredentials($payload);

        if ($this->hasSystemAdminRole((int) $user['user_id'])) {
            throw new ApiException('System admin accounts must use the system admin login', 403);
        }

        return $this->startSession($user);
    }

    public function loginSystemAdmin(array $payload): array
    {
        $user = $this->authenticateCredentials($payload);

        if (!$this->hasSystemAdminRole((int) $user['user_id'])) {
            throw new ApiException('Not authorized as system admin', 403);
        }

        return $this->startSession($user);
    }

    private function authenticateCredentials(array $payload): array
    {
        $email = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : '';
        $password = isset($payload['password']) ? (string) $payload['password'] : '';

        $errors = [];
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email is required';
        }
        if ($password === '') {
            $errors['password'] = 'Password is required';
        }
        if (!empty($errors)) {
            throw new ApiException('Validation failed', 422, $errors);
        }

        $user = $this->repository->findByEmail($email);
        if ($user === null || !password_verify($password, $user['password_hash'])) {
            throw new ApiException('Invalid email or password', 401);
        }

        if ((int) $user['status'] !== 1) {
            throw new ApiException('User account is inactive', 403);
        }

        return $user;
    }

    private function hasSystemAdminRole(int $userId): bool
    {
        foreach ($this->userRoleRepository->findByUserId($userId) as $row) {
            $normalized = strtolower(preg_replace('/[\s_-]+/', '', (string) ($row['role_name'] ?? '')));
            // Accept DB name "SystemAdmin" and snake_case "system_admin"
            if ($normalized === 'systemadmin') {
                return true;
            }
        }

        return false;
    }

    public function refresh(?string $refreshToken, ?string $oldAccessToken): array
    {
        if ($refreshToken === null) {
            throw new ApiException('Session expired, please log in again', 401);
        }

        $userId = $this->store->findRefresh($refreshToken);
        if ($userId === null) {
            throw new ApiException('Session expired, please log in again', 401);
        }

        $user = $this->repository->findById($userId);
        if ($user === null || (int) $user['status'] !== 1) {
            $this->store->deleteRefresh($refreshToken);
            throw new ApiException('Session expired, please log in again', 401);
        }

        $accessToken = $this->createAccessToken($user);
        $this->store->saveAccess($accessToken, $userId, (int) $this->jwtConfig['expiration_seconds']);
        $this->store->saveRefresh($refreshToken, $userId);

        if ($oldAccessToken !== null) {
            $this->store->deleteAccess($oldAccessToken);
        }

        return $this->sessionResult($accessToken, $refreshToken, $user);
    }

    public function logout(?string $refreshToken, ?string $accessToken): void
    {
        try {
            if ($refreshToken !== null) {
                $this->store->deleteRefresh($refreshToken);
            }
            if ($accessToken !== null) {
                $this->store->deleteAccess($accessToken);
            }
        } catch (Throwable $e) {
            return;
        }
    }

    private function startSession(array $user): array
    {
        $userId = (int) $user['user_id'];
        $accessToken = $this->createAccessToken($user);
        $refreshToken = bin2hex(random_bytes(32));

        $this->store->saveRefresh($refreshToken, $userId);
        $this->store->saveAccess($accessToken, $userId, (int) $this->jwtConfig['expiration_seconds']);

        return $this->sessionResult($accessToken, $refreshToken, $user);
    }

    private function createAccessToken(array $user): string
    {
        $now = time();

        return JwtHelper::encode([
            'sub' => (int) $user['user_id'],
            'email' => $user['email'],
            'iat' => $now,
            'exp' => $now + (int) $this->jwtConfig['expiration_seconds'],
        ], $this->jwtConfig['secret']);
    }

    private function sessionResult(string $accessToken, ?string $refreshToken, array $user): array
    {
        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'user' => [
                'user_id' => (int) $user['user_id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'middle_name' => $user['middle_name'] ?? null,
                'last_name' => $user['last_name'],
                'suffix' => $user['suffix'] ?? null,
                'status' => (int) $user['status'],
                'created_at' => $user['created_at'],
                'updated_at' => $user['updated_at'],
            ],
        ];
    }
}
