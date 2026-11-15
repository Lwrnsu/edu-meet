<?php

require_once __DIR__ . '/RedisClient.php';
require_once __DIR__ . '/ApiException.php';

class SessionStore
{
    private array $config;
    private ?RedisClient $redis = null;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/redis.php';
    }

    public function saveRefresh(string $refreshToken, int $userId): void
    {
        $this->write(
            $this->refreshKey($refreshToken),
            json_encode(['user_id' => $userId]),
            (int) $this->config['session_ttl_seconds']
        );
    }

    public function findRefresh(string $refreshToken): ?int
    {
        $stored = $this->run(fn(RedisClient $redis) => $redis->get($this->refreshKey($refreshToken)));
        if ($stored === null) {
            return null;
        }

        $data = json_decode($stored, true);
        $userId = is_array($data) ? (int) ($data['user_id'] ?? 0) : 0;

        return $userId > 0 ? $userId : null;
    }

    public function deleteRefresh(string $refreshToken): void
    {
        $this->run(fn(RedisClient $redis) => $redis->del($this->refreshKey($refreshToken)));
    }

    public function saveAccess(string $accessToken, int $userId, int $ttlSeconds): void
    {
        $this->write($this->accessKey($accessToken), (string) $userId, $ttlSeconds);
    }

    public function accessExists(string $accessToken): bool
    {
        return $this->run(fn(RedisClient $redis) => $redis->get($this->accessKey($accessToken))) !== null;
    }

    public function deleteAccess(string $accessToken): void
    {
        $this->run(fn(RedisClient $redis) => $redis->del($this->accessKey($accessToken)));
    }

    private function write(string $key, string $value, int $ttlSeconds): void
    {
        $this->run(function (RedisClient $redis) use ($key, $value, $ttlSeconds) {
            if (!$redis->set($key, $value, $ttlSeconds)) {
                throw new RuntimeException('Redis write failed');
            }
        });
    }

    private function run(callable $action)
    {
        try {
            return $action($this->client());
        } catch (RuntimeException $e) {
            throw new ApiException('Session service unavailable', 503);
        }
    }

    private function refreshKey(string $token): string
    {
        return 'session:' . hash('sha256', $token);
    }

    private function accessKey(string $token): string
    {
        return 'token:' . hash('sha256', $token);
    }

    private function client(): RedisClient
    {
        if ($this->redis === null) {
            $this->redis = new RedisClient($this->config['host'], (int) $this->config['port']);
        }

        return $this->redis;
    }
}
