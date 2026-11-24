<?php
// Works out who is calling the API and whether they are faculty or a student.
//
// Normal mode: reads the logged-in user id from $_SESSION['user_id'].
// DEV_MODE: when nobody is logged in, the front end may send an X-User-Id header
//           (or ?as=faculty / ?as=student) so features can be tested before login exists.
//           Turn DEV_MODE off once the team's login is connected.

require_once __DIR__ . '/Api.php';
require_once __DIR__ . '/../models/ClassUser.php';

class Auth {
    const DEV_MODE = true;
    const SESSION_USER_ID = 'user_id';

    private static ?array $user = null;

    public static function user(): array {
        if (self::$user) return self::$user;
        $users = new ClassUser();
        $u = null;

        if (!empty($_SESSION[self::SESSION_USER_ID])) {
            $u = $users->find((int)$_SESSION[self::SESSION_USER_ID]);
        } elseif (self::DEV_MODE) {
            if (!empty($_SERVER['HTTP_X_USER_ID'])) {
                $u = $users->find((int)$_SERVER['HTTP_X_USER_ID']);
            } else {
                $u = $users->firstWithRole(($_GET['as'] ?? '') === 'student' ? 'student' : 'faculty');
            }
        }
        if (!$u || !$u['role']) throw new HttpError('Please log in.', 401);
        return self::$user = $u;
    }

    public static function isFaculty(): bool {
        return self::user()['role'] === 'faculty';
    }

    public static function requireFaculty(): array {
        if (!self::isFaculty()) throw new HttpError('Only faculty can do this.', 403);
        return self::user();
    }

    public static function requireStudent(): array {
        if (self::isFaculty()) throw new HttpError('Only students can do this.', 403);
        return self::user();
    }
}
