<?php

require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../repositories/UserRoleRepository.php';
require_once __DIR__ . '/../repositories/PasswordResetRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class PasswordChangeService
{
    private UserRepository $users;
    private UserRoleRepository $userRoles;
    private PasswordResetRepository $resets;

    public function __construct(
        ?UserRepository $users = null,
        ?UserRoleRepository $userRoles = null,
        ?PasswordResetRepository $resets = null
    ) {
        $this->users = $users ?? new UserRepository();
        $this->userRoles = $userRoles ?? new UserRoleRepository();
        $this->resets = $resets ?? new PasswordResetRepository();
    }

    public function requestOtp(array $claims, array $payload): array
    {
        $user = $this->resolveAuthorizedUser($claims, $payload['email'] ?? null);

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $reset = $this->resets->createExpiring(
            (int) $user['user_id'],
            password_hash($otp, PASSWORD_DEFAULT),
            10
        );

        return [
            'message' => 'OTP generated. Use the code to continue (email delivery coming later).',
            'otp' => $otp,
            'expires_at' => $reset['expires_at'],
        ];
    }

    public function verifyOtp(array $claims, array $payload): array
    {
        $user = $this->resolveAuthorizedUser($claims, $payload['email'] ?? null);
        $otp = isset($payload['otp']) ? trim((string) $payload['otp']) : '';

        if (!preg_match('/^\d{6}$/', $otp)) {
            throw new ApiException('Validation failed', 422, ['otp' => 'OTP must be a 6-digit code']);
        }

        $this->assertValidOtp((int) $user['user_id'], $otp);

        return [
            'message' => 'OTP verified. You may change your password.',
        ];
    }

    public function changePassword(array $claims, array $payload): array
    {
        $user = $this->resolveAuthorizedUser($claims, $payload['email'] ?? null);
        $otp = isset($payload['otp']) ? trim((string) $payload['otp']) : '';
        $currentPassword = isset($payload['current_password']) ? (string) $payload['current_password'] : '';
        $newPassword = isset($payload['new_password']) ? (string) $payload['new_password'] : '';
        $confirmPassword = isset($payload['confirm_password']) ? (string) $payload['confirm_password'] : '';

        $errors = [];
        if (!preg_match('/^\d{6}$/', $otp)) {
            $errors['otp'] = 'OTP must be a 6-digit code';
        }
        if ($currentPassword === '') {
            $errors['current_password'] = 'Current password is required';
        }
        if ($newPassword === '') {
            $errors['new_password'] = 'New password is required';
        } elseif (!$this->isStrongPassword($newPassword)) {
            $errors['new_password'] = 'New password must be at least 8 characters and include an uppercase letter, a number, and a special character (@, #, !, %, or _)';
        } elseif ($newPassword === $currentPassword) {
            $errors['new_password'] = 'New password must be different from the current password';
        }
        if ($confirmPassword === '') {
            $errors['confirm_password'] = 'Confirm password is required';
        } elseif ($confirmPassword !== $newPassword) {
            $errors['confirm_password'] = 'New password and confirmation do not match';
        }
        if (!empty($errors)) {
            throw new ApiException('Validation failed', 422, $errors);
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            throw new ApiException('Current password is incorrect', 401);
        }

        $reset = $this->assertValidOtp((int) $user['user_id'], $otp);

        $this->users->update((int) $user['user_id'], [
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'middle_name' => $user['middle_name'] ?? null,
            'last_name' => $user['last_name'],
            'suffix' => $user['suffix'] ?? null,
            'status' => (int) $user['status'],
            'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        ]);

        $this->resets->update((int) $reset['reset_id'], [
            'user_id' => (int) $reset['user_id'],
            'token_hash' => $reset['token_hash'],
            'expires_at' => $reset['expires_at'],
            'is_used' => 1,
        ]);

        return [
            'message' => 'Password updated successfully.',
        ];
    }

    private function resolveAuthorizedUser(array $claims, mixed $emailRaw): array
    {
        $authUserId = isset($claims['sub']) ? (int) $claims['sub'] : 0;
        if ($authUserId <= 0) {
            throw new ApiException('Invalid authentication token', 401);
        }

        if (!$this->hasSystemAdminRole($authUserId)) {
            throw new ApiException('Not authorized as system admin', 403);
        }

        $email = is_string($emailRaw) ? strtolower(trim($emailRaw)) : '';
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('Validation failed', 422, ['email' => 'A valid email is required']);
        }

        $user = $this->users->findById($authUserId);
        if ($user === null) {
            throw new ApiException('User not found', 404);
        }

        if (strtolower((string) $user['email']) !== $email) {
            throw new ApiException('Email does not match the signed-in account', 403);
        }

        return $user;
    }

    private function assertValidOtp(int $userId, string $otp): array
    {
        $reset = $this->resets->findLatestUnusedByUserId($userId);
        if ($reset === null || !password_verify($otp, $reset['token_hash'])) {
            throw new ApiException('Invalid or expired OTP', 401);
        }

        return $reset;
    }

    private function hasSystemAdminRole(int $userId): bool
    {
        foreach ($this->userRoles->findByUserId($userId) as $row) {
            $normalized = strtolower(preg_replace('/[\s_-]+/', '', (string) ($row['role_name'] ?? '')));
            if ($normalized === 'systemadmin') {
                return true;
            }
        }

        return false;
    }

    private function isStrongPassword(string $password): bool
    {
        return strlen($password) >= 8
            && preg_match('/[A-Z]/', $password)
            && preg_match('/[0-9]/', $password)
            && preg_match('/[@#!%_]/', $password);
    }
}
