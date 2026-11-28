<?php
/*
    Who can do what inside a class.

    This is the only file in the Files & Blogs module that reads tables
    owned by other groups. It follows the shared schema in db.sql:

      users(user_id, first_name, last_name)
      school_memberships(membership_id, user_id, department_id, role_id, status) → roles(role_id, name)
      departments(department_id, slug, name) → programs(program_id, department_id, program_code, program_name)
      blocks(block_id, program_id, block_name, year_level)   block_students(block_id, membership_id)
      subjects(subject_id, program_id, subject_code, subject_name)
      classes(class_id, subject_id, professor_membership_id, class_name, room, schedule_day, schedule_time)
      class_blocks(class_id, block_id)   class_students(class_id, membership_id)
      program_chair_assignments(membership_id, program_id)

    If those tables change, update the queries here.

    Rules (from the flowchart and use-case diagram):
    - Managers of a class: its professor, and the college dean of the class's department.
      They upload/edit/delete resources, create posts and tasks, and grade.
    - Students of the class (listed in class_students, or in one of the class's
      blocks) see resources and posts meant for all sections or for their own section.
*/
require_once __DIR__ . "/../helpers/CurrentUser.php";

class ClassAccess {
    public function __construct(private PDO $pdo) {}

    // ---------- people ----------

    // The user's active school membership ids (a user normally has one).
    public function membershipIds(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT membership_id FROM school_memberships
            WHERE user_id = :id AND status = 1 AND deleted_at IS NULL
        ");
        $stmt->execute([':id' => $userId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private static function marks(array $values): string {
        return implode(',', array_fill(0, count($values), '?'));
    }

    // Full name of a user, for "Uploaded by", post authors and submissions.
    public function userNames(array $userIds): array {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($userIds === []) {
            return [];
        }
        $stmt = $this->pdo->prepare("SELECT user_id, first_name, last_name FROM users WHERE user_id IN (" . self::marks($userIds) . ")");
        $stmt->execute($userIds);
        $names = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $names[(int) $row['user_id']] = trim($row['first_name'] . ' ' . $row['last_name']);
        }
        return $names;
    }

    // ---------- classes ----------

    public function classExists(int $classId): bool {
        $stmt = $this->pdo->prepare("SELECT 1 FROM classes WHERE class_id = :id");
        $stmt->execute([':id' => $classId]);
        return (bool) $stmt->fetchColumn();
    }

    private const CLASS_SELECT = "
        c.class_id, c.class_name, c.room, c.schedule_day, c.schedule_time,
        c.academic_year, c.semester, c.professor_membership_id,
        s.subject_code, s.subject_name, s.program_id";

    // What the class banner shows.
    private static function classInfo(array $row): array {
        $schedule = trim(($row['schedule_day'] ?? '') . ' ' . ($row['schedule_time'] ?? ''));
        return [
            'id'           => (int) $row['class_id'],
            'name'         => $row['class_name'],
            'subject_code' => $row['subject_code'] ?? '',
            'subject_name' => $row['subject_name'] ?? '',
            'room'         => $row['room'] ?? '',
            'schedule'     => $schedule,
            'term'         => trim(($row['academic_year'] ?? '') . ' ' . ($row['semester'] ?? '')),
        ];
    }

    // Banner details for one class, or ['id' => .., 'name' => ''] if it doesn't exist.
    public function classDetails(int $classId): array {
        $stmt = $this->pdo->prepare("
            SELECT " . self::CLASS_SELECT . "
            FROM classes c LEFT JOIN subjects s ON s.subject_id = c.subject_id
            WHERE c.class_id = :id
        ");
        $stmt->execute([':id' => $classId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? self::classInfo($row) : ['id' => $classId, 'name' => ''];
    }

    // Class names for notification messages: [class_id => name]
    public function classNames(array $classIds): array {
        $classIds = array_values(array_unique(array_map('intval', $classIds)));
        if ($classIds === []) {
            return [];
        }
        $stmt = $this->pdo->prepare("SELECT class_id, class_name FROM classes WHERE class_id IN (" . self::marks($classIds) . ")");
        $stmt->execute($classIds);
        $names = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $names[(int) $row['class_id']] = $row['class_name'];
        }
        return $names;
    }

    /*
        The classes shown in the sidebar and on the Classes page.
        student: classes they're in · faculty: classes they teach
        dean: classes of their department · program chair: their program's classes + their own
        admins: every class.
    */
    public function myClasses(CurrentUser $user): array {
        $base = "SELECT DISTINCT " . self::CLASS_SELECT . " FROM classes c LEFT JOIN subjects s ON s.subject_id = c.subject_id";
        $members = $this->membershipIds($user->id);
        if ($user->isAdmin()) {
            $stmt = $this->pdo->query("$base ORDER BY c.class_name LIMIT 300");
            return array_map([self::class, 'classInfo'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        if ($members === []) {
            return [];
        }
        $in = self::marks($members);
        $where = match ($user->role) {
            'student' => "c.class_id IN (SELECT class_id FROM class_students WHERE membership_id IN ($in))
                       OR c.class_id IN (SELECT cb.class_id FROM class_blocks cb
                                         INNER JOIN block_students bs ON bs.block_id = cb.block_id
                                         WHERE bs.membership_id IN ($in))",
            'college_dean' => "s.program_id IN (SELECT p.program_id FROM programs p
                                                INNER JOIN school_memberships m ON m.department_id = p.department_id
                                                WHERE m.membership_id IN ($in))
                            OR c.professor_membership_id IN ($in)",
            'program_chair' => "s.program_id IN (SELECT program_id FROM program_chair_assignments WHERE membership_id IN ($in))
                             OR c.professor_membership_id IN ($in)",
            default => "c.professor_membership_id IN ($in)",
        };
        $repeat = match ($user->role) {
            'student', 'college_dean', 'program_chair' => 2,
            default => 1,
        };
        $params = [];
        for ($i = 0; $i < $repeat; $i++) {
            array_push($params, ...$members);
        }
        $stmt = $this->pdo->prepare("$base WHERE $where ORDER BY c.class_name");
        $stmt->execute($params);
        return array_map([self::class, 'classInfo'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // Professor of the class, or the college dean of the class's department.
    public function canManage(CurrentUser $user, int $classId): bool {
        $members = $this->membershipIds($user->id);
        if ($members === []) {
            return false;
        }
        $in = self::marks($members);
        if ($user->is('faculty') || $user->is('program_chair')) {
            $stmt = $this->pdo->prepare("
                SELECT 1 FROM classes WHERE class_id = ? AND professor_membership_id IN ($in)
            ");
        } elseif ($user->is('college_dean')) {
            $stmt = $this->pdo->prepare("
                SELECT 1
                FROM classes c
                INNER JOIN subjects s ON s.subject_id = c.subject_id
                INNER JOIN programs p ON p.program_id = s.program_id
                INNER JOIN school_memberships m ON m.department_id = p.department_id
                WHERE c.class_id = ? AND m.membership_id IN ($in)
            ");
        } else {
            return false;
        }
        $stmt->execute([$classId, ...$members]);
        return (bool) $stmt->fetchColumn();
    }

    /*
        Read-only staff view: admins (every class) and program chairs (classes of their program).
        They see what the class's faculty sees but can't post, edit or grade.
    */
    public function canOversee(CurrentUser $user, int $classId): bool {
        if ($user->isAdmin()) {
            return $this->classExists($classId);
        }
        if (!$user->is('program_chair')) {
            return false;
        }
        $members = $this->membershipIds($user->id);
        if ($members === []) {
            return false;
        }
        $in = self::marks($members);
        $stmt = $this->pdo->prepare("
            SELECT 1 FROM classes c
            INNER JOIN subjects s ON s.subject_id = c.subject_id
            WHERE c.class_id = ?
              AND s.program_id IN (SELECT program_id FROM program_chair_assignments WHERE membership_id IN ($in))
        ");
        $stmt->execute([$classId, ...$members]);
        return (bool) $stmt->fetchColumn();
    }

    /*
        How a student is in a class:
        - ['enrolled' => false]                       not in the class
        - ['enrolled' => true, 'block_id' => 3]       in the class through block 3
        - ['enrolled' => true, 'block_id' => null]    listed in the class with no block (irregular)
    */
    public function enrollment(CurrentUser $user, int $classId): array {
        $none = ['enrolled' => false, 'block_id' => null];
        if (!$user->is('student')) {
            return $none;
        }
        $members = $this->membershipIds($user->id);
        if ($members === []) {
            return $none;
        }
        $in = self::marks($members);
        $stmt = $this->pdo->prepare("
            SELECT cb.block_id FROM class_blocks cb
            INNER JOIN block_students bs ON bs.block_id = cb.block_id
            WHERE cb.class_id = ? AND bs.membership_id IN ($in)
            ORDER BY cb.block_id LIMIT 1
        ");
        $stmt->execute([$classId, ...$members]);
        $block = $stmt->fetchColumn();
        if ($block !== false) {
            return ['enrolled' => true, 'block_id' => (int) $block];
        }
        $stmt = $this->pdo->prepare("SELECT 1 FROM class_students WHERE class_id = ? AND membership_id IN ($in)");
        $stmt->execute([$classId, ...$members]);
        return $stmt->fetchColumn() ? ['enrolled' => true, 'block_id' => null] : $none;
    }

    // ---------- sections (blocks) ----------

    /*
        Columns + joins that turn a block into Department → Program → Section.
        Used everywhere a section is shown. Alias b = blocks.
    */
    public const SECTION_SELECT = "
        b.block_id AS id, b.block_name AS section, b.year_level,
        p.program_id, p.program_code AS program, p.program_name,
        d.department_id, d.slug AS department, d.name AS department_name";
    public const SECTION_JOIN = "
        INNER JOIN programs p ON p.program_id = b.program_id
        INNER JOIN departments d ON d.department_id = p.department_id";
    public const SECTION_ORDER = "d.slug, p.program_code, b.year_level, b.block_name";

    // One section row → what the API returns: label "BSCS 2A" plus its category.
    public static function sectionInfo(array $row): array {
        $program = (string) $row['program'];
        $block = trim((string) $row['section']);
        // block_name may be "2A" or already "BSCS 2A"
        $short = stripos($block, $program . ' ') === 0 ? trim(substr($block, strlen($program))) : $block;
        return [
            'id'         => (int) $row['id'],
            'name'       => $program . ' ' . $short,                   // "BSCS 2A"
            'section'    => $short,                                     // "2A"
            'year_level' => (int) $row['year_level'],
            'program'    => ['id' => (int) $row['program_id'], 'code' => $program, 'name' => $row['program_name']],
            'department' => ['id' => (int) $row['department_id'], 'code' => strtoupper((string) $row['department']), 'name' => $row['department_name']],
        ];
    }

    // The class's sections, sorted Department → Program → Year → Section.
    public function classBlocks(int $classId): array {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT " . self::SECTION_SELECT . "
            FROM class_blocks cb
            INNER JOIN blocks b ON b.block_id = cb.block_id
            " . self::SECTION_JOIN . "
            WHERE cb.class_id = :class_id
            ORDER BY " . self::SECTION_ORDER
        );
        $stmt->execute([':class_id' => $classId]);
        return array_map([self::class, 'sectionInfo'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /*
        The class's sections as a tree for the Target Audience picker:
        [ { code: CCS, name, programs: [ { code: BSCS, name, sections: [ {id, name: "BSCS 2A", section: "2A"} ] } ] } ]
    */
    public static function tree(array $sections): array {
        $departments = [];
        foreach ($sections as $s) {
            $d = $s['department']['id'];
            $p = $s['program']['id'];
            $departments[$d] ??= $s['department'] + ['programs' => []];
            $departments[$d]['programs'][$p] ??= $s['program'] + ['sections' => []];
            $departments[$d]['programs'][$p]['sections'][] = ['id' => $s['id'], 'name' => $s['name'], 'section' => $s['section']];
        }
        foreach ($departments as &$d) {
            $d['programs'] = array_values($d['programs']);
        }
        return array_values($departments);
    }

    /*
        Short text for the "Visible To" column, grouped by program:
        [] → "All sections";  BSCS 2A + BSCS 2B + BSEMC 2A → "BSCS 2A, 2B · BSEMC 2A"
    */
    public static function audienceLabel(array $sections): string {
        if ($sections === []) {
            return 'All sections';
        }
        $byProgram = [];
        foreach ($sections as $s) {
            $byProgram[$s['program']['code']][] = $s['section'];
        }
        $parts = [];
        foreach ($byProgram as $program => $list) {
            $parts[] = $program . ' ' . implode(', ', $list);
        }
        return implode(' · ', $parts);
    }

    // Throws if any section id isn't one of this class's sections.
    public function assertBlocksInClass(int $classId, array $blockIds): void {
        if ($blockIds === []) {
            return;
        }
        $valid = array_column($this->classBlocks($classId), 'id');
        $invalid = array_diff($blockIds, $valid);
        if ($invalid !== []) {
            throw new InvalidArgumentException("Some chosen sections aren't part of this class.");
        }
    }

    /*
        The class's students: [user_id => ['id', 'name', 'block_id']], sorted by name.
        Students listed in class_students plus students of the class's blocks.
    */
    public function classStudents(int $classId): array {
        $stmt = $this->pdo->prepare("
            SELECT m.user_id, MIN(cb.block_id) AS block_id
            FROM school_memberships m
            LEFT JOIN block_students bs ON bs.membership_id = m.membership_id
            LEFT JOIN class_blocks cb ON cb.block_id = bs.block_id AND cb.class_id = :c1
            WHERE m.membership_id IN (SELECT membership_id FROM class_students WHERE class_id = :c2)
               OR cb.class_id IS NOT NULL
            GROUP BY m.user_id
        ");
        $stmt->execute([':c1' => $classId, ':c2' => $classId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $names = $this->userNames(array_column($rows, 'user_id'));
        $out = [];
        foreach ($rows as $r) {
            $id = (int) $r['user_id'];
            $out[$id] = ['id' => $id, 'name' => $names[$id] ?? 'Student', 'block_id' => $r['block_id'] === null ? null : (int) $r['block_id']];
        }
        uasort($out, fn($a, $b) => strcasecmp($a['name'], $b['name']));
        return $out;
    }

    /*
        Students who should hear about something posted to these blocks.
        $blockIds = [] means everyone in the class.
    */
    public function studentIdsFor(int $classId, array $blockIds): array {
        $students = $this->classStudents($classId);
        if ($blockIds !== []) {
            $blockIds = array_map('intval', $blockIds);
            $students = array_filter($students, fn($s) => in_array($s['block_id'], $blockIds, true));
        }
        return array_values(array_map('intval', array_keys($students)));
    }

    // ================================================================
    //  School-wide announcements
    // ================================================================

    // The department a college dean runs, or null.
    public function deanDepartmentId(int $userId): ?int {
        $stmt = $this->pdo->prepare("
            SELECT department_id FROM school_memberships
            WHERE user_id = :id AND status = 1 AND department_id IS NOT NULL
            ORDER BY membership_id LIMIT 1
        ");
        $stmt->execute([':id' => $userId]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    // The program a program chair runs, or null.
    public function chairProgramId(int $userId): ?int {
        $stmt = $this->pdo->prepare("
            SELECT a.program_id FROM program_chair_assignments a
            INNER JOIN school_memberships m ON m.membership_id = a.membership_id
            WHERE m.user_id = :id LIMIT 1
        ");
        $stmt->execute([':id' => $userId]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    // Sections in any class this faculty teaches.
    public function facultyBlockIds(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT cb.block_id
            FROM class_blocks cb
            INNER JOIN classes c ON c.class_id = cb.class_id
            INNER JOIN school_memberships m ON m.membership_id = c.professor_membership_id
            WHERE m.user_id = :id
        ");
        $stmt->execute([':id' => $userId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // [id => ['id', 'code', 'name']]
    public function departments(): array {
        $rows = $this->pdo->query("SELECT department_id, slug, name FROM departments WHERE deleted_at IS NULL ORDER BY slug")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['department_id']] = ['id' => (int) $r['department_id'], 'code' => strtoupper((string) $r['slug']), 'name' => $r['name']];
        }
        return $out;
    }

    // [id => ['id', 'department_id', 'code', 'name']]
    public function programs(): array {
        $rows = $this->pdo->query("SELECT program_id, department_id, program_code, program_name FROM programs ORDER BY program_code")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['program_id']] = ['id' => (int) $r['program_id'], 'department_id' => (int) $r['department_id'], 'code' => $r['program_code'], 'name' => $r['program_name']];
        }
        return $out;
    }

    // Every section in the school, as sectionInfo(), keyed by id.
    public function allSections(): array {
        $rows = $this->pdo->query("
            SELECT " . self::SECTION_SELECT . " FROM blocks b " . self::SECTION_JOIN . "
            ORDER BY " . self::SECTION_ORDER
        )->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['id']] = self::sectionInfo($r);
        }
        return $out;
    }

    // The blocks a student belongs to, with program/department, as SQL.
    private const STUDENT_BLOCKS = "
        SELECT b.block_id, b.program_id, b.year_level, p.department_id
        FROM block_students bs
        INNER JOIN school_memberships m ON m.membership_id = bs.membership_id
        INNER JOIN blocks b ON b.block_id = bs.block_id
        INNER JOIN programs p ON p.program_id = b.program_id";

    // "Does target t reach a student in block sb?" (sb = one row of STUDENT_BLOCKS)
    private const TARGET_MATCH = "(
           (t.scope_type = 'department'   AND sb.department_id = t.department_id
                                          AND (t.year_level IS NULL OR sb.year_level = t.year_level))
        OR (t.scope_type = 'program'      AND sb.program_id = t.program_id)
        OR (t.scope_type = 'year_level'   AND sb.year_level = t.year_level)
        OR (t.scope_type = 'program_year' AND sb.program_id = t.program_id AND sb.year_level = t.year_level)
        OR (t.scope_type = 'section'      AND sb.block_id = t.block_id)
    )";

    /*
        SQL test: "does announcement target t reach this student?"
        A student is reached through their sections (blocks).
        Students with no section are reached only by whole-school announcements.
        Use with alias t = announcement_targets and one parameter :student_id.
    */
    public const TARGET_REACHES_STUDENT = "(
        t.scope_type = 'school'
        OR EXISTS (
            SELECT 1 FROM (" . self::STUDENT_BLOCKS . " WHERE m.user_id = :student_id) sb
            WHERE " . self::TARGET_MATCH . "
        )
    )";

    // Every student an announcement reaches, for its notifications.
    public function announcementRecipients(int $announcementId): array {
        $school = $this->pdo->prepare("
            SELECT 1 FROM announcement_targets WHERE announcement_id = :id AND scope_type = 'school'
        ");
        $school->execute([':id' => $announcementId]);
        if ($school->fetchColumn()) {
            $stmt = $this->pdo->query("
                SELECT DISTINCT m.user_id FROM school_memberships m
                INNER JOIN roles r ON r.role_id = m.role_id
                WHERE m.status = 1 AND LOWER(REPLACE(r.name, ' ', '')) = 'student'
            ");
            return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        }
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT sb.user_id
            FROM announcement_targets t
            INNER JOIN (
                SELECT m.user_id, b.block_id, b.program_id, b.year_level, p.department_id
                FROM block_students bs
                INNER JOIN school_memberships m ON m.membership_id = bs.membership_id
                INNER JOIN blocks b ON b.block_id = bs.block_id
                INNER JOIN programs p ON p.program_id = b.program_id
            ) sb ON " . self::TARGET_MATCH . "
            WHERE t.announcement_id = :id
        ");
        $stmt->execute([':id' => $announcementId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }
}
