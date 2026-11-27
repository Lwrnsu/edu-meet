<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../repository/UserRepository.php';
require_once __DIR__ . '/../repository/SchoolRepository.php';
require_once __DIR__ . '/../repository/SchoolMembershipRepository.php';
require_once __DIR__ . '/../repository/RoleRepository.php';
require_once __DIR__ . '/../repository/UserRoleRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';

class SignupService
{
    private PDO $db;
    private UserRepository $users;
    private SchoolRepository $schools;
    private SchoolMembershipRepository $memberships;
    private RoleRepository $roles;
    private UserRoleRepository $userRoles;

    public function __construct(
        ?PDO $db = null,
        ?UserRepository $users = null,
        ?SchoolRepository $schools = null,
        ?SchoolMembershipRepository $memberships = null,
        ?RoleRepository $roles = null,
        ?UserRoleRepository $userRoles = null
    ) {
        $this->db = $db ?? Database::connect();
        $this->users = $users ?? new UserRepository($this->db);
        $this->schools = $schools ?? new SchoolRepository($this->db);
        $this->memberships = $memberships ?? new SchoolMembershipRepository($this->db);
        $this->roles = $roles ?? new RoleRepository($this->db);
        $this->userRoles = $userRoles ?? new UserRoleRepository($this->db);
    }

    public function register(array $payload): array
    {
        $data = $this->validate($payload);

        $role = $this->roles->findByName('SchoolAdmin');
        if ($role === null) {
            throw new ApiException('SchoolAdmin role is not configured', 500);
        }

        if ($this->users->emailExists($data['email'])) {
            throw new ApiException('Email already in use', 409, ['email' => $data['email']]);
        }

        if ($this->schools->emailExists($data['email'])) {
            throw new ApiException('School email already in use', 409, ['email' => $data['email']]);
        }

        $slug = $this->uniqueSlug($data['school_name']);

        $this->db->beginTransaction();

        try {
            $userId = $this->users->create([
                'email' => $data['email'],
                'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'],
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'],
                'status' => 0,
            ]);

            $schoolId = $this->schools->create([
                'name' => $data['school_name'],
                'location' => $data['location'],
                'email' => $data['email'],
                'slug' => $slug,
                'status' => 0,
            ]);

            $this->memberships->create([
                'school_id' => $schoolId,
                'department_id' => null,
                'user_id' => $userId,
                'role_id' => (int) $role['role_id'],
                'status' => 0,
            ]);

            $this->userRoles->create($userId, (int) $role['role_id']);

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        $user = $this->users->findById($userId);
        $school = $this->schools->findById($schoolId);

        if ($user === null || $school === null) {
            throw new ApiException('Signup completed but records could not be loaded', 500);
        }

        return [
            'message' => 'Signup submitted. Your account is pending system admin approval.',
            'user' => $this->toPublicUser($user),
            'school' => $this->toPublicSchool($school),
        ];
    }

    private function validate(array $payload): array
    {
        $errors = [];

        $firstName = isset($payload['first_name']) ? trim((string) $payload['first_name']) : '';
        $lastName = isset($payload['last_name']) ? trim((string) $payload['last_name']) : '';
        $middleName = $this->optionalName($payload, 'middle_name', 100, $errors);
        $suffix = $this->optionalName($payload, 'suffix', 20, $errors);
        $email = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : '';
        $password = isset($payload['password']) ? (string) $payload['password'] : '';
        $confirmPassword = isset($payload['confirm_password']) ? (string) $payload['confirm_password'] : '';
        $schoolName = isset($payload['school_name']) ? trim((string) $payload['school_name']) : '';
        $location = isset($payload['location']) ? trim((string) $payload['location']) : '';
        $acceptedTerms = $payload['accepted_terms'] ?? false;

        if ($firstName === '') {
            $errors['first_name'] = 'First name is required';
        } elseif (strlen($firstName) > 100) {
            $errors['first_name'] = 'First name must be at most 100 characters';
        } elseif (!$this->isLettersOnlyName($firstName)) {
            $errors['first_name'] = 'First name must contain letters only.';
        }

        if ($lastName === '') {
            $errors['last_name'] = 'Last name is required';
        } elseif (strlen($lastName) > 100) {
            $errors['last_name'] = 'Last name must be at most 100 characters';
        } elseif (!$this->isLettersOnlyName($lastName)) {
            $errors['last_name'] = 'Last name must contain letters only.';
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email is required';
        } elseif (strlen($email) > 255) {
            $errors['email'] = 'Email must be at most 255 characters';
        }

        if (trim($password) === '') {
            $errors['password'] = 'Password is required';
        } elseif (strlen($password) < 6) {
            $errors['password'] = 'Password must be at least 6 characters';
        }

        if ($confirmPassword === '') {
            $errors['confirm_password'] = 'Confirm password is required';
        } elseif ($password !== $confirmPassword) {
            $errors['confirm_password'] = 'Passwords do not match';
        }

        if ($schoolName === '') {
            $errors['school_name'] = 'School name is required';
        } elseif (strlen($schoolName) > 128) {
            $errors['school_name'] = 'School name must be at most 128 characters';
        } elseif (!$this->isLettersOnlyName($schoolName)) {
            $errors['school_name'] = 'School name must contain letters only.';
        }

        if ($location === '') {
            $errors['location'] = 'Location is required';
        } elseif (strlen($location) > 255) {
            $errors['location'] = 'Location must be at most 255 characters';
        }

        if ($acceptedTerms !== true && $acceptedTerms !== 1 && $acceptedTerms !== '1') {
            $errors['accepted_terms'] = 'You must agree to the Terms of Service and Privacy Policy';
        }

        if (!empty($errors)) {
            throw new ApiException('Validation failed', 422, $errors);
        }

        return [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'middle_name' => $middleName,
            'suffix' => $suffix,
            'email' => $email,
            'password' => $password,
            'school_name' => $schoolName,
            'location' => $location,
        ];
    }

    private function optionalName(array $payload, string $field, int $maxLength, array &$errors): ?string
    {
        if (!array_key_exists($field, $payload) || $payload[$field] === null) {
            return null;
        }

        $value = trim((string) $payload[$field]);
        if ($value === '') {
            return null;
        }

        $label = ucfirst(str_replace('_', ' ', $field));
        if (strlen($value) > $maxLength) {
            $errors[$field] = "{$label} must be at most {$maxLength} characters";
        } elseif (!$this->isLettersOnlyName($value)) {
            $errors[$field] = "{$label} must contain letters only.";
        }

        return $value;
    }

    private function isLettersOnlyName(string $value): bool
    {
        return preg_match('/^[A-Za-z]+(?: [A-Za-z]+)*$/', $value) === 1;
    }

    private function uniqueSlug(string $schoolName): string
    {
        $base = strtolower(trim($schoolName));
        $base = preg_replace('/[^a-z0-9]+/', '-', $base) ?? '';
        $base = trim($base, '-');
        if ($base === '') {
            $base = 'school';
        }
        if (strlen($base) > 120) {
            $base = substr($base, 0, 120);
            $base = rtrim($base, '-');
        }

        $slug = $base;
        $suffix = 2;
        while ($this->schools->slugExists($slug)) {
            $slug = $base . '-' . $suffix;
            $suffix++;
        }

        return $slug;
    }

    private function toPublicUser(array $user): array
    {
        return [
            'user_id' => (int) $user['user_id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'middle_name' => $user['middle_name'] ?? null,
            'last_name' => $user['last_name'],
            'suffix' => $user['suffix'] ?? null,
            'status' => (int) $user['status'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
        ];
    }

    private function toPublicSchool(array $school): array
    {
        return [
            'school_id' => (int) $school['school_id'],
            'name' => $school['name'],
            'location' => $school['location'],
            'email' => $school['email'],
            'slug' => $school['slug'],
            'status' => (int) $school['status'],
            'created_at' => $school['created_at'],
            'updated_at' => $school['updated_at'],
        ];
    }
}
