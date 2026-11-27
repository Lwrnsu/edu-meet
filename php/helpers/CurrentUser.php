<?php
/*
    The logged-in user making the request, read from the PHP session.

    The Authentication module must put user_id and role in the session
    after login. Until it does, every request gets 401 "Please log in first."
*/
class CurrentUser {
    public const ROLES = ['student', 'faculty', 'dean', 'college_admin', 'system_admin'];

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
        if (!is_numeric($id) || !in_array($role, self::ROLES, true)) {
            return null;
        }
        return new self((int) $id, (string) $role);
    }

    public function is(string $role): bool {
        return $this->role === $role;
    }
}
