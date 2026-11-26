<?php
class AuthController extends Controller
{
    /** GET auth.me : who am I + class banner info + CSRF token. */
    public function me()
    {
        Http::ok([
            'user'       => ['id' => (int) $this->me['id'], 'name' => $this->me['name'], 'role' => $this->me['role']],
            'class'      => CLASS_INFO,
            'csrf'       => Auth::csrf(),
            'dev_switch' => Auth::devSwitch(),
            'limits'     => ['max_bytes' => MAX_BYTES, 'allowed' => ALLOWED, 'viewable' => VIEWABLE],
        ]);
    }

    /** POST auth.switchRole {role: faculty|student} : DEV_MODE only. */
    public function switchRole()
    {
        if (!Auth::devSwitch()) Http::fail('Role switching is disabled.', 403);
        $_SESSION['dev_role'] = Request::str('role') === 'student' ? 'student' : 'faculty';
        Http::ok([], 'Role switched.');
    }
}
