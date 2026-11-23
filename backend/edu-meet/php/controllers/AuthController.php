<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../services/SignupService.php';
require_once __DIR__ . '/../services/PasswordChangeService.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/CookieHelper.php';

class AuthController
{
    private AuthService $service;
    private SignupService $signupService;
    private PasswordChangeService $passwordChangeService;
    private array $cookies;
    private array $jwtConfig;
    private array $redisConfig;

    public function __construct(
        ?AuthService $service = null,
        ?SignupService $signupService = null,
        ?PasswordChangeService $passwordChangeService = null
    ) {
        $this->service = $service ?? new AuthService();
        $this->signupService = $signupService ?? new SignupService();
        $this->passwordChangeService = $passwordChangeService ?? new PasswordChangeService();
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

    public function schoolLogin(): void
    {
        $this->handlePost(fn(array $payload) => $this->withCookies($this->service->loginSchoolPortal($payload)));
    }

    /** @deprecated Use schoolLogin() */
    public function collegeAdminLogin(): void
    {
        $this->schoolLogin();
    }

    public function signup(): void
    {
        $this->handlePost(fn(array $payload) => $this->signupService->register($payload), 201);
    }

    public function requestPasswordOtp(array $claims): void
    {
        $this->handlePost(
            fn(array $payload) => $this->passwordChangeService->requestOtp($claims, $payload)
        );
    }

    public function verifyPasswordOtp(array $claims): void
    {
        $this->handlePost(
            fn(array $payload) => $this->passwordChangeService->verifyOtp($claims, $payload)
        );
    }

    public function changePassword(array $claims): void
    {
        $this->handlePost(
            fn(array $payload) => $this->passwordChangeService->changePassword($claims, $payload)
        );
    }

    public function requestForgotPasswordOtp(): void
    {
        $this->handlePost(
            fn(array $payload) => $this->passwordChangeService->requestForgotOtp($payload)
        );
    }

    public function verifyForgotPasswordOtp(): void
    {
        $this->handlePost(
            fn(array $payload) => $this->passwordChangeService->verifyForgotOtp($payload)
        );
    }

    public function resetForgotPassword(): void
    {
        $this->handlePost(
            fn(array $payload) => $this->passwordChangeService->resetForgotPassword($payload)
        );
    }

    public function refresh(): void
    {
        $this->handlePost(function (array $payload) {
            try {
                return $this->withCookies($this->service->refresh(
                    $this->resolveRefreshToken($payload),
                    $this->resolveAccessToken($payload)
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
                $this->resolveRefreshToken($payload),
                $this->resolveAccessToken($payload)
            );
            $this->clearCookies();

            return ['message' => 'Logged out'];
        });
    }

    private function resolveRefreshToken(array $payload): ?string
    {
        $fromCookie = CookieHelper::get($this->cookies['refresh_name']);
        if ($fromCookie !== null) {
            return $fromCookie;
        }

        $fromBody = $payload['refresh_token'] ?? null;

        return is_string($fromBody) && $fromBody !== '' ? $fromBody : null;
    }

    private function resolveAccessToken(array $payload): ?string
    {
        $fromCookie = CookieHelper::get($this->cookies['access_name']);
        if ($fromCookie !== null) {
            return $fromCookie;
        }

        $fromBody = $payload['access_token'] ?? null;
        if (is_string($fromBody) && $fromBody !== '') {
            return $fromBody;
        }

        return $this->getBearerToken();
    }

    private function getBearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        if (!is_string($header) || $header === '') {
            return null;
        }

        if (preg_match('/^Bearer\s+(\S+)$/i', $header, $matches) !== 1) {
            return null;
        }

        return $matches[1];
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

        // Include tokens in JSON so Java proxy / token-based admin clients can persist the session.
        return [
            'user' => $session['user'],
            'access_token' => $session['access_token'],
            'refresh_token' => $session['refresh_token'],
        ];
    }

    private function clearCookies(): void
    {
        CookieHelper::clear($this->cookies['access_name']);
        CookieHelper::clear($this->cookies['refresh_name']);
    }

    private function handlePost(callable $action, int $successStatus = 200): void
    {
        try {
            if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
                Response::error('Method not allowed', 405);
            }

            $payload = $this->readJsonBody();
            Response::json($action($payload), $successStatus);
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
