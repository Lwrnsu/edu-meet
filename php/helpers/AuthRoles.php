<?php

/**
 * Shared role normalization for Auth (portal keys, JWT/app roles, CurrentUser).
 */
class AuthRoles
{
    /** @var array<string, array{priority:int, key:string, label:string}> */
    public const SCHOOL_ROLE_MAP = [
        'schooladmin' => ['priority' => 1, 'key' => 'college_admin', 'label' => 'College Admin'],
        'collegeadmin' => ['priority' => 1, 'key' => 'college_admin', 'label' => 'College Admin'],
        'collegedean' => ['priority' => 2, 'key' => 'college_dean', 'label' => 'College Dean'],
        'programchair' => ['priority' => 3, 'key' => 'program_chair', 'label' => 'Program Chair'],
        'faculty' => ['priority' => 4, 'key' => 'faculty', 'label' => 'Faculty'],
        'student' => ['priority' => 5, 'key' => 'student', 'label' => 'Student'],
    ];

    /** Portal / Spring / DB role → CurrentUser::ROLES vocabulary */
    private const APP_ROLE_MAP = [
        'systemadmin' => 'system_admin',
        'schooladmin' => 'college_admin',
        'collegeadmin' => 'college_admin',
        'collegedean' => 'dean',
        'dean' => 'dean',
        'programchair' => 'program_chair',
        'faculty' => 'faculty',
        'student' => 'student',
    ];

    public static function normalize(string $name): string
    {
        return strtolower(preg_replace('/[\s_-]+/', '', $name) ?? '');
    }

    public static function toAppRole(?string $role): ?string
    {
        if ($role === null) {
            return null;
        }

        $trimmed = trim($role);
        if ($trimmed === '') {
            return null;
        }

        $normalized = self::normalize($trimmed);
        if ($normalized === '') {
            return null;
        }

        return self::APP_ROLE_MAP[$normalized] ?? null;
    }

    /**
     * @return array{key:string, label:string}|null
     */
    public static function portalFromNormalized(string $normalized): ?array
    {
        if (!isset(self::SCHOOL_ROLE_MAP[$normalized])) {
            return null;
        }

        $mapped = self::SCHOOL_ROLE_MAP[$normalized];

        return [
            'key' => $mapped['key'],
            'label' => $mapped['label'],
        ];
    }
}
