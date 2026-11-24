<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../config/Database.php';

class ScopeController extends BaseController {
    private const YEAR_LABELS = [
        1 => 'Year 1 (1st Year)',
        2 => 'Year 2 (2nd Year)',
        3 => 'Year 3 (3rd Year)',
        4 => 'Year 4 (Graduating)',
    ];

    public function index(array $query = []): ApiResponse {
        try {
            $pdo = Database::connect();
            $userId = isset($query['user_id']) && (int) $query['user_id'] > 0
                ? (int) $query['user_id']
                : 1001;

            $users = $this->fetchUsers($pdo);
            $activeUser = $this->findActiveUser($users, $userId);
            if ($activeUser !== null) {
                $userId = (int) $activeUser['user_id'];
            }

            $departments = $this->fetchDepartments($pdo);
            $programs = $this->fetchPrograms($pdo);
            $sections = $this->fetchSections($pdo);
            $facultySections = $this->fetchFacultySections($pdo);

            $targetOptions = $activeUser !== null
                ? $this->buildTargetOptions($activeUser, $userId, $departments, $programs, $sections, $facultySections)
                : [];

            return $this->ok(200, 'Role scopes retrieved successfully.', [
                'active_user'      => $activeUser,
                'users'            => $users,
                'departments'      => $departments,
                'programs'         => $programs,
                'sections'         => $sections,
                'faculty_sections' => $facultySections,
                'target_options'   => $targetOptions,
            ]);
        } catch (Throwable $e) {
            return $this->fail(500, 'Failed to load role scopes.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function fetchUsers(PDO $pdo): array {
        return $pdo->query("
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.section_id,
                u.year_level,
                u.program_id,
                u.department_id,
                s.section_name
            FROM users u
            LEFT JOIN sections s ON s.section_id = u.section_id
            ORDER BY
                CASE u.role
                    WHEN 'faculty' THEN 1
                    WHEN 'program_chair' THEN 2
                    WHEN 'dean' THEN 3
                    WHEN 'admin' THEN 4
                    WHEN 'student' THEN 5
                    ELSE 6
                END,
                u.user_id ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    private function findActiveUser(array $users, int $userId): ?array {
        foreach ($users as $u) {
            if ((int) $u['user_id'] === $userId) {
                return $u;
            }
        }
        return $users[0] ?? null;
    }

    private function fetchDepartments(PDO $pdo): array {
        return $pdo->query("
            SELECT department_id, department_code, department_name
            FROM departments
            ORDER BY department_id ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    private function fetchPrograms(PDO $pdo): array {
        return $pdo->query("
            SELECT program_id, department_id, program_code, program_name, max_years
            FROM programs
            ORDER BY program_id ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    private function fetchSections(PDO $pdo): array {
        return $pdo->query("
            SELECT section_id, section_code, section_name, year_level, program_id, department_id
            FROM sections
            ORDER BY section_code ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    private function fetchFacultySections(PDO $pdo): array {
        return $pdo->query("
            SELECT user_id, section_id
            FROM faculty_sections
            ORDER BY user_id ASC, section_id ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    private function buildTargetOptions(
        array $activeUser,
        int $userId,
        array $departments,
        array $programs,
        array $sections,
        array $facultySections
    ): array {
        $options = [];
        $add = static function (string $group, string $value, string $label) use (&$options): void {
            $options[] = [
                'group' => $group,
                'value' => $value,
                'label' => $label,
            ];
        };

        $role = (string) $activeUser['role'];

        if ($role === 'faculty') {
            $assignedIds = [];
            foreach ($facultySections as $fs) {
                if ((int) $fs['user_id'] === $userId) {
                    $assignedIds[] = (int) $fs['section_id'];
                }
            }
            foreach ($sections as $sec) {
                if (in_array((int) $sec['section_id'], $assignedIds, true)) {
                    $add(
                        'Assigned Sections',
                        'SEC:' . $sec['section_id'],
                        $sec['section_name'] . ' (Year ' . $sec['year_level'] . ')'
                    );
                }
            }
        } elseif ($role === 'program_chair') {
            $progId = (int) ($activeUser['program_id'] ?? 10);
            foreach ($programs as $p) {
                if ((int) $p['program_id'] === $progId) {
                    $add('Whole Program', 'PROG:' . $p['program_id'], 'All ' . $p['program_code'] . ' Students');
                    $maxYr = min(4, (int) ($p['max_years'] ?? 4));
                    for ($y = 1; $y <= $maxYr; $y++) {
                        $add(
                            'Year Levels in ' . $p['program_code'],
                            'PROG_YR:' . $p['program_id'] . ':' . $y,
                            $p['program_code'] . ' — ' . (self::YEAR_LABELS[$y] ?? "Year $y")
                        );
                    }
                    break;
                }
            }
            foreach ($sections as $sec) {
                if ((int) $sec['program_id'] === $progId) {
                    $add('Sections in Program', 'SEC:' . $sec['section_id'], $sec['section_name']);
                }
            }
        } elseif ($role === 'dean') {
            $deptId = (int) ($activeUser['department_id'] ?? 1);
            foreach ($departments as $d) {
                if ((int) $d['department_id'] === $deptId) {
                    $add(
                        'Whole Department',
                        'DEPT:' . $d['department_id'],
                        'All ' . $d['department_code'] . ' Students (' . $d['department_name'] . ')'
                    );
                    for ($y = 1; $y <= 4; $y++) {
                        $add(
                            'Year Levels in ' . $d['department_code'],
                            'DEPT_YR:' . $d['department_id'] . ':' . $y,
                            $d['department_code'] . ' — ' . (self::YEAR_LABELS[$y] ?? "Year $y")
                        );
                    }
                    break;
                }
            }

            $deptProgIds = [];
            foreach ($programs as $prog) {
                if ((int) $prog['department_id'] === $deptId) {
                    $pid = (int) $prog['program_id'];
                    $deptProgIds[] = $pid;
                    $add(
                        'Programs in Department',
                        'PROG:' . $pid,
                        'All ' . $prog['program_code'] . ' (' . $prog['program_name'] . ')'
                    );
                    $maxYr = min(4, (int) ($prog['max_years'] ?? 4));
                    for ($y = 1; $y <= $maxYr; $y++) {
                        $add(
                            'Program + Year Level',
                            "PROG_YR:{$pid}:{$y}",
                            $prog['program_code'] . ' — ' . (self::YEAR_LABELS[$y] ?? "Year $y")
                        );
                    }
                }
            }

            foreach ($sections as $sec) {
                if ((int) $sec['department_id'] === $deptId || in_array((int) $sec['program_id'], $deptProgIds, true)) {
                    $add('Sections in Department', 'SEC:' . $sec['section_id'], $sec['section_name']);
                }
            }
        } elseif ($role === 'admin') {
            $add('All Students', 'ALL_STUDENTS', 'All Students (Entire College)');

            for ($y = 1; $y <= 4; $y++) {
                $add('Whole Year Level (All Programs)', 'YR:' . $y, self::YEAR_LABELS[$y] ?? "Year $y");
            }

            foreach ($departments as $dept) {
                $add(
                    'Whole Department / Multiple Departments',
                    'DEPT:' . $dept['department_id'],
                    $dept['department_code'] . ' — ' . $dept['department_name']
                );
            }

            foreach ($programs as $prog) {
                $pid = (int) $prog['program_id'];
                $add(
                    'Whole Program / Multiple Programs',
                    'PROG:' . $pid,
                    $prog['program_code'] . ' — ' . $prog['program_name']
                );
                $maxYr = min(4, (int) ($prog['max_years'] ?? 4));
                for ($y = 1; $y <= $maxYr; $y++) {
                    $add(
                        'Year Level in a Program',
                        "PROG_YR:{$pid}:{$y}",
                        $prog['program_code'] . ' — ' . (self::YEAR_LABELS[$y] ?? "Year $y")
                    );
                }
            }

            foreach ($sections as $sec) {
                $add('Sections', 'SEC:' . $sec['section_id'], $sec['section_name']);
            }
        }

        return $options;
    }
}