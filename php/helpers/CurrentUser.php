<?php
/*
    The logged-in user making the request.

    Who: the same login token the rest of EduMeet uses (Spring session token
    or PHP JWT, sent as "Authorization: Bearer ..." or the edu_meet_token
    cookie) — checked by middleware/AuthMiddleware.php.
    A PHP session with user_id + role is also accepted (used by local tests).

    Role: the user's school membership role from the database
    (school_memberships → roles), the same mapping AuthService uses at login.
    Role keys: student, faculty, program_chair, college_dean, college_admin, system_admin.
*/
class CurrentUser {
    public const ROLES = ['student', 'faculty', 'program_chair', 'college_dean', 'college_admin', 'system_admin'];
    public const ADMINS = ['college_admin', 'system_admin'];

    // Role names as stored in the roles table (spaces, "_" and "-" removed, lower case) → role key.
    private const ROLE_NAMES = [
        'student' => 'student',
        'faculty' => 'faculty',
        'programchair' => 'program_chair',
        'collegedean' => 'college_dean',
        'dean' => 'college_dean',
        'collegeadmin' => 'college_admin',
        'schooladmin' => 'college_admin',
        'systemadmin' => 'system_admin',
    ];
    // When someone has several memberships, the most powerful one wins (same order as AuthService).
    private const PRIORITY = ['system_admin', 'college_admin', 'college_dean', 'program_chair', 'faculty', 'student'];

    public function __construct(
        public readonly int $id,
        public readonly string $role
    ) {
        if (!in_array($role, self::ROLES, true)) {
            throw new InvalidArgumentException("Unknown role: $role");
        }
    }

    // A role name from the database or a token ("College Dean", "program_chair") → role key, or null.
    public static function roleKey(?string $name): ?string {
        $normalized = strtolower((string) preg_replace('/[\s_-]+/', '', (string) $name));
        return self::ROLE_NAMES[$normalized] ?? null;
    }

    public static function fromRequest(?PDO $pdo = null): ?self {
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            session_start();
        }
        $sessionId = $_SESSION['user_id'] ?? null;
        $sessionRole = self::roleKey($_SESSION['role'] ?? null);
        if (is_numeric($sessionId) && $sessionRole !== null) {
            return new self((int) $sessionId, $sessionRole);
        }

        require_once __DIR__ . '/../middleware/AuthMiddleware.php';
        $claims = AuthMiddleware::tryAuth();
        $userId = (int) ($claims['sub'] ?? 0);
        if ($userId <= 0) {
            return null;
        }
        $role = self::roleKey($claims['role'] ?? null);
        if ($role === null) {
            if ($pdo === null) {
                require_once __DIR__ . '/../config/Database.php';
                $pdo = Database::connect();
            }
            $role = self::roleFromDatabase($pdo, $userId);
        }
        return $role === null ? null : new self($userId, $role);
    }

    // The user's strongest active role from school memberships and system roles.
    public static function roleFromDatabase(PDO $pdo, int $userId): ?string {
        $stmt = $pdo->prepare("
            SELECT r.name FROM school_memberships m
            INNER JOIN roles r ON r.role_id = m.role_id
            WHERE m.user_id = :id AND m.status = 1 AND m.deleted_at IS NULL
            UNION ALL
            SELECT r.name FROM user_roles ur
            INNER JOIN roles r ON r.role_id = ur.role_id
            WHERE ur.user_id = :id2
        ");
        $stmt->execute([':id' => $userId, ':id2' => $userId]);
        $found = array_filter(array_map([self::class, 'roleKey'], $stmt->fetchAll(PDO::FETCH_COLUMN)));
        foreach (self::PRIORITY as $role) {
            if (in_array($role, $found, true)) {
                return $role;
            }
        }
        return null;
    }

    public function isAdmin(): bool {
        return in_array($this->role, self::ADMINS, true);
    }

    public function is(string $role): bool {
        return $this->role === $role;
    }
}
