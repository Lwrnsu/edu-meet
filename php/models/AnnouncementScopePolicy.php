<?php
declare(strict_types=1);

class AnnouncementScopePolicy
{
    public const ALLOWED_ROLES = ['admin', 'dean', 'program_chair', 'faculty'];
    public const ALLOWED_SCOPES = [
        'school',
        'department',
        'program',
        'year_level',
        'program_year',
        'section',
    ];

    private const ROLE_ALLOWED_SCOPES = [
        'admin'         => ['school', 'department', 'program', 'year_level', 'program_year', 'section'],
        'dean'          => ['department', 'program', 'year_level', 'program_year', 'section'],
        'program_chair' => ['program', 'year_level', 'program_year', 'section'],
        'faculty'       => ['section'],
    ];

    public static function validateRole(string $role): string
    {
        $normalized = strtolower(trim($role));
        if (!in_array($normalized, self::ALLOWED_ROLES, true)) {
            throw new InvalidArgumentException(
                "Invalid role '{$role}'. Allowed roles: admin, dean, program_chair, faculty."
            );
        }
        return $normalized;
    }

    /**
     * @param array|string $rawTarget
     * @param int $index
     * @return array<string, int|string|null>
     */
    private static function parseRawTarget(array|string $rawTarget, int $index): array
    {
        if (is_string($rawTarget)) {
            $token = strtoupper(trim($rawTarget));

            if ($token === 'ALL_STUDENTS' || $token === 'SCHOOL') {
                return [
                    'scope_type'    => 'school',
                    'department_id' => null,
                    'program_id'    => null,
                    'year_level'    => null,
                    'section_id'    => null,
                ];
            }
            if (preg_match('/^YR:([1-4])$/', $token, $m)) {
                return [
                    'scope_type'    => 'year_level',
                    'department_id' => null,
                    'program_id'    => null,
                    'year_level'    => (int) $m[1],
                    'section_id'    => null,
                ];
            }
            if (preg_match('/^DEPT:(\d+)$/', $token, $m)) {
                return [
                    'scope_type'    => 'department',
                    'department_id' => (int) $m[1],
                    'program_id'    => null,
                    'year_level'    => null,
                    'section_id'    => null,
                ];
            }
            if (preg_match('/^DEPT_YR:(\d+):([1-4])$/', $token, $m)) {
                return [
                    'scope_type'    => 'department',
                    'department_id' => (int) $m[1],
                    'program_id'    => null,
                    'year_level'    => (int) $m[2],
                    'section_id'    => null,
                ];
            }
            if (preg_match('/^PROG:(\d+)$/', $token, $m)) {
                return [
                    'scope_type'    => 'program',
                    'department_id' => null,
                    'program_id'    => (int) $m[1],
                    'year_level'    => null,
                    'section_id'    => null,
                ];
            }
            if (preg_match('/^PROG_YR:(\d+):([1-4])$/', $token, $m)) {
                return [
                    'scope_type'    => 'program_year',
                    'department_id' => null,
                    'program_id'    => (int) $m[1],
                    'year_level'    => (int) $m[2],
                    'section_id'    => null,
                ];
            }
            if (preg_match('/^SEC:(\d+)$/', $token, $m)) {
                return [
                    'scope_type'    => 'section',
                    'department_id' => null,
                    'program_id'    => null,
                    'year_level'    => null,
                    'section_id'    => (int) $m[1],
                ];
            }

            throw new InvalidArgumentException("Unrecognized target token '{$rawTarget}' at index {$index}.");
        }

        if (empty($rawTarget['scope_type'])) {
            throw new InvalidArgumentException("Target at index {$index} must include a valid scope_type.");
        }

        return [
            'scope_type'    => strtolower(trim((string) $rawTarget['scope_type'])),
            'department_id' => isset($rawTarget['department_id']) && $rawTarget['department_id'] !== ''
                ? (int) $rawTarget['department_id']
                : null,
            'program_id'    => isset($rawTarget['program_id']) && $rawTarget['program_id'] !== ''
                ? (int) $rawTarget['program_id']
                : null,
            'year_level'    => isset($rawTarget['year_level']) && $rawTarget['year_level'] !== ''
                ? (int) $rawTarget['year_level']
                : null,
            'section_id'    => isset($rawTarget['section_id']) && $rawTarget['section_id'] !== ''
                ? (int) $rawTarget['section_id']
                : null,
        ];
    }

    /**
     * @param string $role
     * @param array<int, array<string, mixed>|string> $rawTargets
     * @param array<string, mixed>|null $actorPermissions
     * @return array<int, array<string, int|string|null>>
     */
    public static function normalizeAndAuthorizeTargets(
        string $role,
        array $rawTargets,
        ?array $actorPermissions = null
    ): array {
        $validatedRole = self::validateRole($role);

        if ($rawTargets === []) {
            throw new InvalidArgumentException("At least one target audience scope is required.");
        }

        $allowedForRole = self::ROLE_ALLOWED_SCOPES[$validatedRole];
        $normalizedTargets = [];

        foreach ($rawTargets as $index => $rawTarget) {
            if (!is_array($rawTarget) && !is_string($rawTarget)) {
                throw new InvalidArgumentException("Target at index {$index} must be an array or target token string.");
            }

            $parsed = self::parseRawTarget($rawTarget, (int) $index);
            $scopeType = (string) $parsed['scope_type'];

            if (!in_array($scopeType, self::ALLOWED_SCOPES, true)) {
                throw new InvalidArgumentException("Unsupported scope_type '{$scopeType}'.");
            }

            if (!in_array($scopeType, $allowedForRole, true)) {
                throw new InvalidArgumentException(
                    "Role '{$validatedRole}' is not permitted to publish to scope '{$scopeType}'."
                );
            }

            $departmentId = $parsed['department_id'];
            $programId    = $parsed['program_id'];
            $yearLevel    = $parsed['year_level'];
            $sectionId    = $parsed['section_id'];

            self::validateScopeFields($scopeType, $departmentId, $programId, $yearLevel, $sectionId);

            if ($actorPermissions !== null) {
                self::enforceActorBoundaries(
                    $validatedRole,
                    $scopeType,
                    $departmentId,
                    $programId,
                    $yearLevel,
                    $sectionId,
                    $actorPermissions
                );
            }

            $normalizedTargets[] = [
                'scope_type'    => $scopeType,
                'department_id' => $departmentId,
                'program_id'    => $programId,
                'year_level'    => $yearLevel,
                'section_id'    => $sectionId,
            ];
        }

        return $normalizedTargets;
    }

    private static function validateScopeFields(
        string $scopeType,
        ?int $departmentId,
        ?int $programId,
        ?int $yearLevel,
        ?int $sectionId
    ): void {
        match ($scopeType) {
            'school' => null,
            'department' => $departmentId && $departmentId > 0
                ? null
                : throw new InvalidArgumentException("department_id is required for 'department' scope."),
            'program' => $programId && $programId > 0
                ? null
                : throw new InvalidArgumentException("program_id is required for 'program' scope."),
            'year_level' => ($yearLevel && $yearLevel >= 1 && $yearLevel <= 4)
                ? null
                : throw new InvalidArgumentException("year_level (1-4) is required for 'year_level' scope."),
            'program_year' => ($programId && $programId > 0 && $yearLevel && $yearLevel >= 1 && $yearLevel <= 4)
                ? null
                : throw new InvalidArgumentException("program_id and year_level (1-4) are required for 'program_year' scope."),
            'section' => $sectionId && $sectionId > 0
                ? null
                : throw new InvalidArgumentException("section_id is required for 'section' scope."),
        };
    }

    private static function enforceActorBoundaries(
        string $role,
        string $scopeType,
        ?int $departmentId,
        ?int $programId,
        ?int $yearLevel,
        ?int $sectionId,
        array $permissions
    ): void {
        if ($role === 'admin') {
            return;
        }

        if ($role === 'dean') {
            $allowedDepts = array_map('intval', $permissions['department_ids'] ?? []);
            $allowedProgs = array_map('intval', $permissions['program_ids'] ?? []);
            $allowedSecs  = array_map('intval', $permissions['section_ids'] ?? []);

            if ($departmentId !== null && $allowedDepts !== [] && !in_array($departmentId, $allowedDepts, true)) {
                throw new InvalidArgumentException("Dean is not assigned to the requested department.");
            }
            if ($programId !== null && $allowedProgs !== [] && !in_array($programId, $allowedProgs, true)) {
                throw new InvalidArgumentException("Dean is not assigned to the requested program.");
            }
            if ($sectionId !== null && $allowedSecs !== [] && !in_array($sectionId, $allowedSecs, true)) {
                throw new InvalidArgumentException("Dean is not assigned to section_id {$sectionId}.");
            }
            return;
        }

        if ($role === 'program_chair') {
            $allowedProgs  = array_map('intval', $permissions['program_ids'] ?? []);
            $allowedYears  = array_map('intval', $permissions['year_levels'] ?? [1, 2, 3, 4]);
            $allowedSecs   = array_map('intval', $permissions['section_ids'] ?? []);

            if ($programId !== null && $allowedProgs !== [] && !in_array($programId, $allowedProgs, true)) {
                throw new InvalidArgumentException("Program chair is not assigned to the requested program.");
            }
            if ($yearLevel !== null && !in_array($yearLevel, $allowedYears, true)) {
                throw new InvalidArgumentException("Program chair is not assigned to the requested year level.");
            }
            if ($sectionId !== null && $allowedSecs !== [] && !in_array($sectionId, $allowedSecs, true)) {
                throw new InvalidArgumentException("Program chair is not assigned to section_id {$sectionId}.");
            }
            return;
        }

        if ($role === 'faculty') {
            $allowedSections = array_map('intval', $permissions['section_ids'] ?? []);
            if ($sectionId === null || !in_array($sectionId, $allowedSections, true)) {
                throw new InvalidArgumentException("Faculty is not assigned to section_id {$sectionId}.");
            }
        }
    }
}