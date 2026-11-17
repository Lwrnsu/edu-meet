<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/CookieHelper.php';

class AuthController
{
    private AuthService $service;
    private array $cookies;
    private array $jwtConfig;
    private array $redisConfig;

    public function __construct(?AuthService $service = null)
    {
        $this->service = $service ?? new AuthService();
        $this->cookies = require __DIR__ . '/../config/cookies.php';
        $this->jwtConfig = require __DIR__ . '/../config/jwt.php';
        $this->redisConfig = require __DIR__ . '/../config/redis.php';
    }

    public function login(): void
    {
        $this->handlePost(fn(array $payload) => $this->withCookies($this->service->login($payload)));
    }

    public function systemAdminLogin(): void
    {
        $this->handlePost(fn(array $payload) => $this->withCookies($this->service->loginSystemAdmin($payload)));
    }

    public function refresh(): void
    {
        $this->handlePost(function (array $payload) {
            try {
                return $this->withCookies($this->service->refresh(
                    CookieHelper::get($this->cookies['refresh_name']),
                    CookieHelper::get($this->cookies['access_name'])
                ));
            } catch (ApiException $e) {
                if ($e->getCode() === 401) {
                    $this->clearCookies();
                }
                throw $e;
            }
        });
    }

    public function logout(): void
    {
        $this->handlePost(function (array $payload) {
            $this->service->logout(
                CookieHelper::get($this->cookies['refresh_name']),
                CookieHelper::get($this->cookies['access_name'])
            );
            $this->clearCookies();

            return ['message' => 'Logged out'];
        });
    }

    private function withCookies(array $session): array
    {
        CookieHelper::set(
            $this->cookies['access_name'],
            $session['access_token'],
            (int) $this->jwtConfig['expiration_seconds']
        );

        if ($session['refresh_token'] !== null) {
            CookieHelper::set(
                $this->cookies['refresh_name'],
                $session['refresh_token'],
                (int) $this->redisConfig['session_ttl_seconds']
            );
        }

        return ['user' => $session['user']];
    }

    private function clearCookies(): void
    {
        CookieHelper::clear($this->cookies['access_name']);
        CookieHelper::clear($this->cookies['refresh_name']);
    }

    private function handlePost(callable $action): void
    {
        try {
            if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
                Response::error('Method not allowed', 405);
            }

            $payload = $this->readJsonBody();
            Response::json($action($payload));
        } catch (ApiException $e) {
            Response::error($e->getMessage(), $e->getCode() ?: 400, $e->getDetails());
        } catch (Throwable $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    private function readJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new ApiException('Invalid JSON body', 400);
        }

        return $data;
    }
}
