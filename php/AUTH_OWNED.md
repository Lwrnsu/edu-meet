# Authentication & Roles — ownership boundaries

Auth and system roles use MySQL database **`edu_meet_db`** (XAMPP). Do **not** point Auth at `EduMeet` (that DB is for class/meeting data). Do **not** `DROP DATABASE edu_meet_db`.

Auth DB access uses `Database::connect()` (PDO) → `edu_meet_db`, and `php/repositories/`.

## Owned (may change)

- `php/api/auth/`
- `php/controllers/AuthController.php`
- `php/services/AuthService.php`, `SignupService.php`, and auth-owned password OTP/change services
- `php/services/RoleService.php`, `UserRoleService.php`
- `php/api/roles.php`, `php/api/user_roles.php`
- JWT/cookie helpers, `php/helpers/AuthIdentity.php`, `php/helpers/AuthRoles.php`
- `php/middleware/AuthMiddleware.php` (singular path only)
- `php/schema_roles.sql`
- Auth services’ requires of `php/repositories/` (use existing APIs; avoid signature churn)
- Small bridge in `php/helpers/CurrentUser.php` (`fromRequest` token fallback only)
- Frontend `src/api/auth.js`, `src/auth/*`, `src/api/roles.js` only when a later phase needs contract fixes

## Do not touch

- Announcements / posts / resources / notifications controllers and services
- Class / quiz / flashcard / study modules
- Chat / LiveKit / Spring room security

## Phase 4 — Canonical paths

- **Middleware:** `php/middleware/AuthMiddleware.php` only. `php/middlewares/AuthMiddleware.php` is a deprecated forwarder (do not reintroduce a second class body there).
- **Data access:** `php/repositories/` + `Database::connect()` (PDO). `php/repository/` is a deprecated mysqli leftover — see `php/repository/DEPRECATED.md`.
- Do **not** edit both trees for the same change. Do **not** delete the deprecated folders in this phase.

## Shared caution

- `php/config/Database.php` — surgical fixes only; every PHP module loads it

## Role model

- **Portal keys** (API / frontend school portal): `college_admin`, `college_dean`, `program_chair`, `faculty`, `student`
- **App / CurrentUser keys** (JWT `role`, Group 7 session): `college_admin`, `dean` (from `college_dean`), `program_chair`, `faculty`, `student`, `system_admin`
- **`user_roles`**: global assignments (e.g. SystemAdmin)
- **`school_memberships.role_id`**: school-portal context used by school login
- **Role catalog CRUD** (`/api/roles.php`, mutating `/api/user_roles.php`): `system_admin` only
- **GET** roles / user_roles: `system_admin` or `college_admin`

## Cookies & tokens

- PHP HttpOnly access cookie: `edu_meet_token` (refresh: `edu_meet_refresh`)
- Frontend document cookie alias also accepted: `edu_meet_access`
- SPA primary auth for PHP APIs: `Authorization: Bearer <PHP JWT or Redis token>`
- **Refresh / logout:** Spring Redis owns session refresh and Redis invalidation (`POST /api/auth/logOut`). PHP `/api/auth/refresh.php` always fails closed; PHP logout only clears PHP cookies.

## Apply auth schema + role seeds (`edu_meet_db` only)

Import tables from repo `db.sql` into `edu_meet_db` with `IF NOT EXISTS` (never drop the database):

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS edu_meet_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# rewrite EduMeet → edu_meet_db and CREATE TABLE IF NOT EXISTS, then SOURCE — see project setup notes
& "C:\xampp\mysql\bin\mysql.exe" -u root edu_meet_db -e "SOURCE C:/xampp/htdocs/edu-meet/php/schema_roles.sql"
```

Role seeds only:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root edu_meet_db -e "SOURCE C:/xampp/htdocs/edu-meet/php/schema_roles.sql"
```

Or with Docker MySQL (set password / DB name as needed):

```powershell
Get-Content C:\xampp\htdocs\edu-meet\php\schema_roles.sql | docker exec -i mysql mysql -uroot -psecret edu_meet_db
```

## Phase 1 smoke

From repo root, with MySQL up and `edu_meet_db` created:

```powershell
& "C:\xampp\php\php.exe" -r "require 'php/config/Database.php'; Database::connect(); echo 'ok';"
```

Start PHP built-in server (separate terminal):

```powershell
cd C:\xampp\htdocs\edu-meet\php
& "C:\xampp\php\php.exe" -S 127.0.0.1:8000
```

Expect **4xx**, not **500**:

```powershell
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8000/api/auth/school_login.php -ContentType 'application/json' -Body '{}'
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8000/api/auth/system_admin_login.php -ContentType 'application/json' -Body '{}'
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8000/api/auth/signup.php -ContentType 'application/json' -Body '{}'
```

Confirm seeded roles:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root edu_meet_db -e "SELECT name, status FROM roles WHERE deleted_at IS NULL ORDER BY name;"
```
