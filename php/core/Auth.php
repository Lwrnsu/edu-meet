<?php
final class Auth
{
    private static $me = false;

    /** True when the dev role-switcher is active (no real login in session). */
    public static function devSwitch(): bool
    {
        return DEV_MODE && empty($_SESSION[SESSION_USER_ID]);
    }

    /** Current user as [id, name, role] or null if not logged in. */
    public static function user(): ?array
    {
        if (self::$me !== false) return self::$me;

        $pdo = Db::pdo();
        $me = null;
        if (self::devSwitch()) {
            $st = $pdo->prepare('SELECT * FROM ' . Db::users() . ' u WHERE role = ? ORDER BY id LIMIT 1');
            $st->execute([$_SESSION['dev_role'] ?? 'faculty']);
            $me = $st->fetch();
        } elseif (!empty($_SESSION[SESSION_USER_ID])) {
            $st = $pdo->prepare('SELECT * FROM ' . Db::users() . ' u WHERE id = ?');
            $st->execute([$_SESSION[SESSION_USER_ID]]);
            $me = $st->fetch();
        }
        self::$me = ($me && $me['role']) ? $me : null;
        return self::$me;
    }

    public static function csrf(): string
    {
        if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
        return $_SESSION['csrf'];
    }

    /** Token is read from the X-CSRF-Token header or a "csrf" field. */
    public static function verifyCsrf(): void
    {
        $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? (string) Request::get('csrf', '');
        if (!hash_equals(self::csrf(), $sent)) {
            Http::fail('Your session expired. Refresh the page and try again.', 419);
        }
    }
}
