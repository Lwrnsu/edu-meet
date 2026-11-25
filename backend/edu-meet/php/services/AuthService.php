<?php

require_once __DIR__ . '/../repositories/UserRepository.php';
require_once __DIR__ . '/../repositories/UserRoleRepository.php';
require_once __DIR__ . '/../repositories/SchoolMembershipRepository.php';
require_once __DIR__ . '/../repositories/SchoolRepository.php';
require_once __DIR__ . '/../helpers/ApiException.php';
require_once __DIR__ . '/../helpers/JwtHelper.php';

class AuthService
{
    private UserRepository $repository;
    private UserRoleRepository $userRoleRepository;
    private SchoolMembershipRepository $membershipRepository;
    private SchoolRepository $schoolRepository;
    private array $jwtConfig;

    /** @var array<string, array{priority:int, key:string, label:string}> */
    private const SCHOOL_ROLE_MAP = [
        'schooladmin' => ['priority' => 1, 'key' => 'college_admin', 'label' => 'College Admin'],
        'collegeadmin' => ['priority' => 1, 'key' => 'college_admin', 'label' => 'College Admin'],
        'collegedean' => ['priority' => 2, 'key' => 'college_dean', 'label' => 'College Dean'],
        'programchair' => ['priority' => 3, 'key' => 'program_chair', 'label' => 'Program Chair'],
        'faculty' => ['priority' => 4, 'key' => 'faculty', 'label' => 'Faculty'],
        'student' => ['priority' => 5, 'key' => 'student', 'label' => 'Student'],
    ];

    public function __construct(
        ?UserRepository $repository = null,
        ?UserRoleRepository $userRoleRepository = null,
        ?SchoolMembershipRepository $membershipRepository = null,
        ?SchoolRepository $schoolRepository = null
    ) {
        $this->repository = $repository ?? new UserRepository();
        $this->userRoleRepository = $userRoleRepository ?? new UserRoleRepository();
        $this->membershipRepository = $membershipRepository ?? new SchoolMembershipRepository();
        $this->schoolRepository = $schoolRepository ?? new SchoolRepository();
        $this->jwtConfig = require __DIR__ . '/../config/jwt.php';
    }

    public function login(array $payload): array
    {
        $user = $this->authenticateCredentials($payload);

        if ($this->hasSystemAdminRole((int) $user['user_id'])) {
            throw new ApiException('System admin accounts must use the system admin login', 403);
        }

        if ($this->resolveSchoolPortalContext((int) $user['user_id']) !== null) {
            throw new ApiException('School portal accounts must use the school login', 403);
        }

        return $this->startSession($user);
    }

    public function loginSystemAdmin(array $payload): array
    {
        $user = $this->authenticateCredentials($payload);

        if (!$this->hasSystemAdminRole((int) $user['user_id'])) {
            throw new ApiException('Not authorized as system admin', 403);
        }

        return $this->startSession($user);
    }

    public function loginSchoolPortal(array $payload): array
    {
        $user = $this->authenticateCredentials($payload);

        if ($this->hasSystemAdminRole((int) $user['user_id'])) {
            throw new ApiException('System admin accounts must use the system admin login', 403);
        }

        $context = $this->resolveSchoolPortalContext((int) $user['user_id']);
        if ($context === null) {
            throw new ApiException('Not authorized for the school portal', 403);
        }

        return $this->startSession($user, $context);
    }

    /** @deprecated Use loginSchoolPortal() */
    public function loginCollegeAdmin(array $payload): array
    {
        return $this->loginSchoolPortal($payload);
    }

    private function authenticateCredentials(array $payload): array
    {
        $email = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : '';
        $password = isset($payload['password']) ? (string) $payload['password'] : '';

        $errors = [];
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email is required';
        }
        if ($password === '') {
            $errors['password'] = 'Password is required';
        }
        if (!empty($errors)) {
            throw new ApiException('Validation failed', 422, $errors);
        }

        $user = $this->repository->findByEmail($email);
        if ($user === null || !password_verify($password, $user['password_hash'])) {
            throw new ApiException('Invalid email or password', 401);
        }

        if ((int) $user['status'] !== 1) {
            throw new ApiException('User account is inactive', 403);
        }

        return $user;
    }

    private function hasSystemAdminRole(int $userId): bool
    {
        foreach ($this->userRoleRepository->findByUserId($userId) as $row) {
            $normalized = strtolower(preg_replace('/[\s_-]+/', '', (string) ($row['role_name'] ?? '')));
            if ($normalized === 'systemadmin') {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{role:string, role_label:string, school:array{school_id:int, name:string}}|null
     */
    private function resolveSchoolPortalContext(int $userId): ?array
    {
        $best = null;

        foreach ($this->membershipRepository->findByUserId($userId) as $row) {
            if ((int) ($row['status'] ?? 0) !== 1) {
                continue;
            }

            $normalized = strtolower(preg_replace('/[\s_-]+/', '', (string) ($row['role_name'] ?? '')));
            if (!isset(self::SCHOOL_ROLE_MAP[$normalized])) {
                continue;
            }

            $schoolId = (int) ($row['school_id'] ?? 0);
            if ($schoolId <= 0) {
                continue;
            }

            $school = $this->schoolRepository->findById($schoolId);
            if ($school === null || (int) ($school['status'] ?? 0) !== 1) {
                continue;
            }

            $mapped = self::SCHOOL_ROLE_MAP[$normalized];
            $candidate = [
                'priority' => $mapped['priority'],
                'role' => $mapped['key'],
                'role_label' => $mapped['label'],
                'school' => [
                    'school_id' => (int) $school['school_id'],
                    'name' => (string) $school['name'],
                ],
            ];

            if ($best === null || $candidate['priority'] < $best['priority']) {
                $best = $candidate;
            }
        }

        if ($best === null) {
            return null;
        }

        return [
            'role' => $best['role'],
            'role_label' => $best['role_label'],
            'school' => $best['school'],
        ];
    }

    public function refresh(?string $refreshToken, ?string $oldAccessToken): array
    {
        throw new ApiException('Session refresh is handled by Spring Boot', 401);
    }

    public function logout(?string $refreshToken, ?string $accessToken): void
    {
        // Session invalidation is handled by Spring Boot POST /api/auth/logOut
    }

    private function startSession(array $user, ?array $context = null): array
    {
        $accessToken = $this->createAccessToken($user);
        $refreshToken = bin2hex(random_bytes(32));

        return $this->sessionResult($accessToken, $refreshToken, $user, $context);
    }

    private function createAccessToken(array $user): string
    {
        $now = time();

        return JwtHelper::encode([
            'sub' => (int) $user['user_id'],
            'email' => $user['email'],
            'iat' => $now,
            'exp' => $now + (int) $this->jwtConfig['expiration_seconds'],
        ], $this->jwtConfig['secret']);
    }

    private function sessionResult(
        string $accessToken,
        ?string $refreshToken,
        array $user,
        ?array $context = null
    ): array {
        $result = [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'user' => [
                'user_id' => (int) $user['user_id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'middle_name' => $user['middle_name'] ?? null,
                'last_name' => $user['last_name'],
                'suffix' => $user['suffix'] ?? null,
                'status' => (int) $user['status'],
                'created_at' => $user['created_at'],
                'updated_at' => $user['updated_at'],
            ],
        ];

        if ($context !== null) {
            $result['role'] = $context['role'];
            $result['role_label'] = $context['role_label'];
            $result['school'] = $context['school'];
            $result['user']['role'] = $context['role'];
            $result['user']['role_label'] = $context['role_label'];
            $result['user']['school'] = $context['school'];
        }

        return $result;
    }
}
