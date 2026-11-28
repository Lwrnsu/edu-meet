<?php
/*
    The logged-in user making the request.

    Prefer PHP session values set by Authentication. If missing (SPA Bearer flow),
    resolve identity via AuthIdentity without changing Group 7 controllers.
*/
require_once __DIR__ . '/AuthIdentity.php';

class CurrentUser {
    public const ROLES = ['student', 'faculty', 'program_chair', 'dean', 'college_admin', 'system_admin'];
    public const ADMINS = ['college_admin', 'system_admin'];

    public function __construct(
        public readonly int $id,
        public readonly string $role
    ) {
        if (!in_array($role, self::ROLES, true)) {
            throw new InvalidArgumentException("Unknown role: $role");
        }
    }

    public static function fromRequest(): ?self {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $id = $_SESSION['user_id'] ?? null;
        $role = $_SESSION['role'] ?? null;
        if (is_numeric($id) && in_array($role, self::ROLES, true)) {
            return new self((int) $id, (string) $role);
        }

        $identity = AuthIdentity::resolve();
        if ($identity === null || $identity['app_role'] === null) {
            return null;
        }

        if (!in_array($identity['app_role'], self::ROLES, true)) {
            return null;
        }

        $_SESSION['user_id'] = $identity['user_id'];
        $_SESSION['role'] = $identity['app_role'];

        return new self($identity['user_id'], $identity['app_role']);
    }

    public function isAdmin(): bool {
        return in_array($this->role, self::ADMINS, true);
    }

    public function is(string $role): bool {
        return $this->role === $role;
    }
}
