<?php
/*
    Target audience of a school-wide announcement: who may post to whom.
    (Based on MANGALINDAN's AnnouncementScopePolicy.)

    A target is a token chosen in the Target Audience picker:
        ALL_STUDENTS            whole school
        YR:2                    one year level, every program
        DEPT:3                  one department
        DEPT_YR:3:2             one year level of one department
        PROG:8                  one program
        PROG_YR:8:2             one year level of one program
        SEC:1                   one section (block)
    An object like {scope_type, department_id, program_id, year_level, section_id}
    is accepted too.

    Who may use which targets. The poster's department, program and sections
    come from the database (ClassAccess), never from the request.
        college_admin, system_admin   everything
        dean                          own department: DEPT, DEPT_YR, PROG, PROG_YR, SEC
        program_chair                 own program:    PROG, PROG_YR, SEC
        faculty                       SEC of sections they teach
        student                       cannot post
*/
require_once __DIR__ . "/ClassAccess.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";

class AnnouncementScope {
    public const SCOPES = ['school', 'department', 'program', 'year_level', 'program_year', 'section'];
    public const MAX_YEAR = 4;

    private const ROLE_SCOPES = [
        'system_admin'  => self::SCOPES,
        'college_admin' => self::SCOPES,
        'dean'          => ['department', 'program', 'program_year', 'section'],
        'program_chair' => ['program', 'program_year', 'section'],
        'faculty'       => ['section'],
        'student'       => [],
    ];

    private const YEAR_LABELS = [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'];

    private ?array $departments = null;
    private ?array $programs = null;
    private ?array $sections = null;

    public function __construct(private ClassAccess $access) {}

    public static function canPost(CurrentUser $user): bool {
        return self::ROLE_SCOPES[$user->role] !== [];
    }

    /*
        Checks the chosen targets and returns them cleaned up:
        [['scope_type', 'department_id', 'program_id', 'year_level', 'block_id'], ...]
        Throws InvalidArgumentException with a message for the user.
    */
    public function authorize(CurrentUser $user, array $rawTargets): array {
        if ($rawTargets === []) {
            throw new InvalidArgumentException("Choose at least one target audience.");
        }
        $allowed = self::ROLE_SCOPES[$user->role];
        $targets = [];
        foreach (array_values($rawTargets) as $i => $raw) {
            $t = self::parse($raw, $i);
            if (!in_array($t['scope_type'], $allowed, true)) {
                throw new InvalidArgumentException("You can't post to " . $this->label($t) . ".");
            }
            $this->assertExists($t);
            $this->assertWithinReach($user, $t);
            $targets[self::token($t)] = $t;   // drops duplicates
        }
        return array_values($targets);
    }

    // Token string or target object → target row. Throws if it's malformed.
    public static function parse(array|string $raw, int $index = 0): array {
        $t = ['scope_type' => null, 'department_id' => null, 'program_id' => null, 'year_level' => null, 'block_id' => null];
        if (is_string($raw)) {
            $token = strtoupper(trim($raw));
            $y = '([1-' . self::MAX_YEAR . '])';
            if ($token === 'ALL_STUDENTS' || $token === 'SCHOOL') {
                $t['scope_type'] = 'school';
            } elseif (preg_match("/^YR:$y$/", $token, $m)) {
                $t = ['scope_type' => 'year_level', 'year_level' => (int) $m[1]] + $t;
            } elseif (preg_match('/^DEPT:(\d+)$/', $token, $m)) {
                $t = ['scope_type' => 'department', 'department_id' => (int) $m[1]] + $t;
            } elseif (preg_match("/^DEPT_YR:(\d+):$y$/", $token, $m)) {
                $t = ['scope_type' => 'department', 'department_id' => (int) $m[1], 'year_level' => (int) $m[2]] + $t;
            } elseif (preg_match('/^PROG:(\d+)$/', $token, $m)) {
                $t = ['scope_type' => 'program', 'program_id' => (int) $m[1]] + $t;
            } elseif (preg_match("/^PROG_YR:(\d+):$y$/", $token, $m)) {
                $t = ['scope_type' => 'program_year', 'program_id' => (int) $m[1], 'year_level' => (int) $m[2]] + $t;
            } elseif (preg_match('/^SEC:(\d+)$/', $token, $m)) {
                $t = ['scope_type' => 'section', 'block_id' => (int) $m[1]] + $t;
            } else {
                throw new InvalidArgumentException("Target #" . ($index + 1) . " isn't a valid audience.");
            }
            return $t;
        }

        $int = fn($k) => isset($raw[$k]) && $raw[$k] !== '' && $raw[$k] !== null ? (int) $raw[$k] : null;
        $t = [
            'scope_type'    => strtolower(trim((string) ($raw['scope_type'] ?? ''))),
            'department_id' => $int('department_id'),
            'program_id'    => $int('program_id'),
            'year_level'    => $int('year_level'),
            'block_id'      => $int('section_id') ?? $int('block_id'),
        ];
        $need = match ($t['scope_type']) {
            'school'       => [],
            'department'   => ['department_id'],
            'program'      => ['program_id'],
            'year_level'   => ['year_level'],
            'program_year' => ['program_id', 'year_level'],
            'section'      => ['block_id'],
            default        => throw new InvalidArgumentException("Target #" . ($index + 1) . " isn't a valid audience."),
        };
        foreach ($need as $field) {
            if (!$t[$field] || $t[$field] < 1) {
                throw new InvalidArgumentException("Target #" . ($index + 1) . " is missing its " . str_replace('block_id', 'section', $field) . ".");
            }
        }
        if ($t['year_level'] !== null && ($t['year_level'] < 1 || $t['year_level'] > self::MAX_YEAR)) {
            throw new InvalidArgumentException("Year level must be 1 to " . self::MAX_YEAR . ".");
        }
        // Keep only the fields this scope uses.
        $keep = array_merge(['scope_type'], $need, $t['scope_type'] === 'department' ? ['year_level'] : []);
        foreach (array_keys($t) as $k) {
            if (!in_array($k, $keep, true)) {
                $t[$k] = null;
            }
        }
        return $t;
    }

    // Target row → token, e.g. "PROG_YR:8:2".
    public static function token(array $t): string {
        return match ($t['scope_type']) {
            'school'       => 'ALL_STUDENTS',
            'year_level'   => 'YR:' . $t['year_level'],
            'department'   => $t['year_level'] ? "DEPT_YR:{$t['department_id']}:{$t['year_level']}" : 'DEPT:' . $t['department_id'],
            'program'      => 'PROG:' . $t['program_id'],
            'program_year' => "PROG_YR:{$t['program_id']}:{$t['year_level']}",
            'section'      => 'SEC:' . $t['block_id'],
        };
    }

    // Human label, e.g. "BSCS · 2nd Year".
    public function label(array $t): string {
        $year = fn() => self::YEAR_LABELS[$t['year_level']] ?? "Year {$t['year_level']}";
        $dept = fn() => $this->departments()[$t['department_id']]['code'] ?? 'a department';
        $prog = fn() => $this->programs()[$t['program_id']]['code'] ?? 'a program';
        return match ($t['scope_type']) {
            'school'       => 'All students',
            'year_level'   => $year() . ' (all programs)',
            'department'   => $t['year_level'] ? $dept() . ' · ' . $year() : 'All ' . $dept(),
            'program'      => 'All ' . $prog(),
            'program_year' => $prog() . ' · ' . $year(),
            'section'      => $this->sections()[$t['block_id']]['name'] ?? 'a section',
        };
    }

    public function labels(array $targets): string {
        return implode(', ', array_map([$this, 'label'], $targets));
    }

    /*
        Choices for the Target Audience picker, for this user only:
        [{group, value (token), label}, ...]
    */
    public function options(CurrentUser $user): array {
        $options = [];
        $add = function (string $group, array $t) use (&$options) {
            $options[] = ['group' => $group, 'value' => self::token($t), 'label' => $this->label($t)];
        };
        $t = fn(array $fields) => $fields + ['department_id' => null, 'program_id' => null, 'year_level' => null, 'block_id' => null];
        $years = range(1, self::MAX_YEAR);

        if ($user->isAdmin()) {
            $add('Whole school', $t(['scope_type' => 'school']));
            foreach ($years as $y) {
                $add('Year level (all programs)', $t(['scope_type' => 'year_level', 'year_level' => $y]));
            }
            $departments = array_keys($this->departments());
            $programs = array_keys($this->programs());
            $sections = array_keys($this->sections());
        } elseif ($user->is('dean')) {
            $deptId = $this->access->deanDepartmentId($user->id);
            $departments = $deptId ? [$deptId] : [];
            $programs = array_keys(array_filter($this->programs(), fn($p) => $p['department_id'] === $deptId));
            $sections = array_keys(array_filter($this->sections(), fn($s) => $s['department']['id'] === $deptId));
        } elseif ($user->is('program_chair')) {
            $progId = $this->access->chairProgramId($user->id);
            $departments = [];
            $programs = $progId ? [$progId] : [];
            $sections = array_keys(array_filter($this->sections(), fn($s) => $s['program']['id'] === $progId));
        } elseif ($user->is('faculty')) {
            $departments = $programs = [];
            $sections = array_values(array_intersect(array_keys($this->sections()), $this->access->facultyBlockIds($user->id)));
        } else {
            return [];
        }

        foreach ($departments as $d) {
            $add('Department', $t(['scope_type' => 'department', 'department_id' => $d]));
            foreach ($years as $y) {
                $add('Year level in a department', $t(['scope_type' => 'department', 'department_id' => $d, 'year_level' => $y]));
            }
        }
        foreach ($programs as $p) {
            $add('Program', $t(['scope_type' => 'program', 'program_id' => $p]));
            foreach ($years as $y) {
                $add('Year level in a program', $t(['scope_type' => 'program_year', 'program_id' => $p, 'year_level' => $y]));
            }
        }
        foreach ($sections as $s) {
            $add('Section', $t(['scope_type' => 'section', 'block_id' => $s]));
        }
        return $options;
    }

    private function assertExists(array $t): void {
        if ($t['department_id'] !== null && !isset($this->departments()[$t['department_id']])) {
            throw new InvalidArgumentException("That department doesn't exist.");
        }
        if ($t['program_id'] !== null && !isset($this->programs()[$t['program_id']])) {
            throw new InvalidArgumentException("That program doesn't exist.");
        }
        if ($t['block_id'] !== null && !isset($this->sections()[$t['block_id']])) {
            throw new InvalidArgumentException("That section doesn't exist.");
        }
    }

    // Deans stay in their department, chairs in their program, faculty in their sections.
    private function assertWithinReach(CurrentUser $user, array $t): void {
        if ($user->isAdmin()) {
            return;
        }
        $deptOf = fn(array $t) => $t['department_id']
            ?? ($t['program_id'] !== null ? $this->programs()[$t['program_id']]['department_id'] : null)
            ?? ($t['block_id'] !== null ? $this->sections()[$t['block_id']]['department']['id'] : null);
        $progOf = fn(array $t) => $t['program_id']
            ?? ($t['block_id'] !== null ? $this->sections()[$t['block_id']]['program']['id'] : null);

        $ok = match ($user->role) {
            'dean'          => $deptOf($t) !== null && $deptOf($t) === $this->access->deanDepartmentId($user->id),
            'program_chair' => $progOf($t) !== null && $progOf($t) === $this->access->chairProgramId($user->id),
            'faculty'       => in_array($t['block_id'], $this->access->facultyBlockIds($user->id), true),
            default         => false,
        };
        if (!$ok) {
            throw new InvalidArgumentException("You can't post to " . $this->label($t) . ".");
        }
    }

    private function departments(): array { return $this->departments ??= $this->access->departments(); }
    private function programs(): array { return $this->programs ??= $this->access->programs(); }
    private function sections(): array { return $this->sections ??= $this->access->allSections(); }
}
