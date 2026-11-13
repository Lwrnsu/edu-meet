<?php

require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/JwtHelper.php';
require_once __DIR__ . '/../helpers/RedisClient.php';

class AuthService
{
    private UserRepository $repository;
    private array $jwtConfig;
    private array $redisConfig;
    private ?RedisClient $redis = null;

    public function __construct(?UserRepository $repository = null)
    {
        $this->repository = $repository ?? new UserRepository();
        $this->jwtConfig = require __DIR__ . '/../config/jwt.php';
        $this->redisConfig = require __DIR__ . '/../config/redis.php';
    }

    public function login(array $payload): array
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

        return $this->buildSession($user, $this->createRefreshToken((int) $user['user_id']));
    }

    public function refresh(array $payload): array
    {
        $refreshToken = isset($payload['refresh_token']) ? (string) $payload['refresh_token'] : '';
        if ($refreshToken === '') {
            throw new ApiException('Validation failed', 422, ['refresh_token' => 'Refresh token is required']);
        }

        $redis = $this->redis();
        $key = $this->sessionKey($refreshToken);
        $stored = $redis->get($key);
        if ($stored === null) {
            throw new ApiException('Session expired, please log in again', 401);
        }

        $data = json_decode($stored, true);
        $userId = is_array($data) ? (int) ($data['user_id'] ?? 0) : 0;
        $user = $userId > 0 ? $this->repository->findById($userId) : null;

        if ($user === null || (int) $user['status'] !== 1) {
            $redis->del($key);
            throw new ApiException('Session expired, please log in again', 401);
        }

        $redis->set($key, $stored, (int) $this->redisConfig['session_ttl_seconds']);

        return $this->buildSession($user, $refreshToken);
    }

    public function logout(array $payload): void
    {
        $refreshToken = isset($payload['refresh_token']) ? (string) $payload['refresh_token'] : '';
        if ($refreshToken === '') {
            return;
        }

        try {
            $this->redis()->del($this->sessionKey($refreshToken));
        } catch (Throwable $e) {
            return;
        }
    }

    private function buildSession(array $user, ?string $refreshToken): array
    {
        $now = time();
        $token = JwtHelper::encode([
            'sub' => (int) $user['user_id'],
            'email' => $user['email'],
            'iat' => $now,
            'exp' => $now + (int) $this->jwtConfig['expiration_seconds'],
        ], $this->jwtConfig['secret']);

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'refresh_token' => $refreshToken,
            'user' => [
                'user_id' => (int) $user['user_id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'status' => (int) $user['status'],
                'created_at' => $user['created_at'],
                'updated_at' => $user['updated_at'],
            ],
        ];
    }

    private function createRefreshToken(int $userId): ?string
    {
        try {
            $refreshToken = bin2hex(random_bytes(32));
            $this->redis()->set(
                $this->sessionKey($refreshToken),
                json_encode(['user_id' => $userId]),
                (int) $this->redisConfig['session_ttl_seconds']
            );

            return $refreshToken;
        } catch (Throwable $e) {
            return null;
        }
    }

    private function sessionKey(string $refreshToken): string
    {
        return 'session:' . hash('sha256', $refreshToken);
    }

    private function redis(): RedisClient
    {
        if ($this->redis === null) {
            $this->redis = new RedisClient($this->redisConfig['host'], (int) $this->redisConfig['port']);
        }

        return $this->redis;
    }
}