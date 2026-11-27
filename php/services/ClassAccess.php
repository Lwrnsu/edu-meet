<?php
/*
    Who can do what inside a class.

    This is the only file in the Files & Blogs module that reads tables
    owned by other groups (users, classes, enrollments, departments, programs,
    blocks, deans, program_chairs). If those groups rename a table or column,
    update the queries here.

    Rules (from the flowchart and use-case diagram):
    - Managers of a class: its assigned faculty, and the dean of its department.
      They upload/edit/delete resources and create posts.
    - Students enrolled in the class see resources and posts meant
      for all sections or for their own section.
*/
require_once __DIR__ . "/../helpers/CurrentUser.php";

class ClassAccess {
    public function __construct(private PDO $pdo) {}

    public function classExists(int $classId): bool {
        $stmt = $this->pdo->prepare("SELECT 1 FROM classes WHERE id = :id");
        $stmt->execute([':id' => $classId]);
        return (bool) $stmt->fetchColumn();
    }

    // Faculty assigned to the class, or the dean of the class's department.
    public function canManage(CurrentUser $user, int $classId): bool {
        if ($user->is('faculty')) {
            $stmt = $this->pdo->prepare("
                SELECT 1 FROM classes WHERE id = :class_id AND faculty_id = :user_id
            ");
        } elseif ($user->is('dean')) {
            $stmt = $this->pdo->prepare("
                SELECT 1
                FROM classes c
                INNER JOIN deans d ON d.department_id = c.department_id
                WHERE c.id = :class_id AND d.id = :user_id
            ");
        } else {
            return false;
        }
        $stmt->execute([':class_id' => $classId, ':user_id' => $user->id]);
        return (bool) $stmt->fetchColumn();
    }

    /*
        How a student is enrolled in a class:
        - ['enrolled' => false]                       not enrolled
        - ['enrolled' => true, 'block_id' => 3]       enrolled in block 3
        - ['enrolled' => true, 'block_id' => null]    enrolled with no block (irregular)
    */
    public function enrollment(CurrentUser $user, int $classId): array {
        if (!$user->is('student')) {
            return ['enrolled' => false, 'block_id' => null];
        }
        $stmt = $this->pdo->prepare("
            SELECT block_id FROM enrollments
            WHERE class_id = :class_id AND student_id = :user_id
            LIMIT 1
        ");
        $stmt->execute([':class_id' => $classId, ':user_id' => $user->id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return ['enrolled' => false, 'block_id' => null];
        }
        return [
            'enrolled' => true,
            'block_id' => $row['block_id'] === null ? null : (int) $row['block_id'],
        ];
    }

    /*
        Columns + joins that turn a section (block) id into
        Department → Program → Section. Used everywhere a section is shown.
    */
    public const SECTION_SELECT = "
        b.id, b.name AS section, b.year_level, b.section AS letter,
        p.id AS program_id, p.code AS program, p.name AS program_name,
        d.id AS department_id, d.code AS department, d.name AS department_name";
    public const SECTION_JOIN = "
        INNER JOIN programs p ON p.id = b.program_id
        INNER JOIN departments d ON d.id = p.department_id";
    public const SECTION_ORDER = "d.code, p.code, b.year_level, b.section";

    // One section row → what the API returns: label "BSCS 2A" plus its category.
    public static function sectionInfo(array $row): array {
        return [
            'id'         => (int) $row['id'],
            'name'       => $row['program'] . ' ' . $row['section'],   // "BSCS 2A"
            'section'    => $row['section'],                            // "2A"
            'year_level' => (int) $row['year_level'],
            'program'    => ['id' => (int) $row['program_id'], 'code' => $row['program'], 'name' => $row['program_name']],
            'department' => ['id' => (int) $row['department_id'], 'code' => $row['department'], 'name' => $row['department_name']],
        ];
    }

    // Sections that have students in this class, sorted Department → Program → Year → Section.
    public function classBlocks(int $classId): array {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT " . self::SECTION_SELECT . "
            FROM enrollments e
            INNER JOIN blocks b ON b.id = e.block_id
            " . self::SECTION_JOIN . "
            WHERE e.class_id = :class_id
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
        Students who should hear about something posted to these blocks.
        $blockIds = [] means every block, including students with no block.
    */
    public function studentIdsFor(int $classId, array $blockIds): array {
        $sql = "SELECT DISTINCT student_id FROM enrollments WHERE class_id = ?";
        $params = [$classId];
        if ($blockIds !== []) {
            $sql .= " AND block_id IN (" . implode(',', array_fill(0, count($blockIds), '?')) . ")";
            array_push($params, ...array_values($blockIds));
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // Class names for notification messages: [class_id => name]
    public function classNames(array $classIds): array {
        $classIds = array_values(array_unique(array_map('intval', $classIds)));
        if ($classIds === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($classIds), '?'));
        $stmt = $this->pdo->prepare("SELECT id, name FROM classes WHERE id IN ($marks)");
        $stmt->execute($classIds);
        $names = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $names[(int) $row['id']] = $row['name'];
        }
        return $names;
    }

    // ================================================================
    //  School-wide announcements (dashboard)
    //  Same tables, plus program_chairs(id, program_id) — program_chairs.id = users.id.
    // ================================================================

    // The department a dean runs (deans.id = users.id), or null.
    public function deanDepartmentId(int $userId): ?int {
        $stmt = $this->pdo->prepare("SELECT department_id FROM deans WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    // The program a program chair runs, or null.
    public function chairProgramId(int $userId): ?int {
        $stmt = $this->pdo->prepare("SELECT program_id FROM program_chairs WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    // Sections that have students in any class this faculty teaches.
    public function facultyBlockIds(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT e.block_id
            FROM enrollments e
            INNER JOIN classes c ON c.id = e.class_id
            WHERE c.faculty_id = :user_id AND e.block_id IS NOT NULL
        ");
        $stmt->execute([':user_id' => $userId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // [id => ['id', 'code', 'name']]
    public function departments(): array {
        $rows = $this->pdo->query("SELECT id, code, name FROM departments ORDER BY code")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['id']] = ['id' => (int) $r['id'], 'code' => $r['code'], 'name' => $r['name']];
        }
        return $out;
    }

    // [id => ['id', 'department_id', 'code', 'name']]
    public function programs(): array {
        $rows = $this->pdo->query("SELECT id, department_id, code, name FROM programs ORDER BY code")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['id']] = ['id' => (int) $r['id'], 'department_id' => (int) $r['department_id'], 'code' => $r['code'], 'name' => $r['name']];
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

    /*
        SQL test: "does announcement target t reach this student?"
        A student is reached through the sections (blocks) they are enrolled in.
        Students with no section are reached only by whole-school announcements.
        Use with alias t = announcement_targets and one parameter :student_id.
    */
    public const TARGET_REACHES_STUDENT = "(
        t.scope_type = 'school'
        OR EXISTS (
            SELECT 1
            FROM enrollments e
            INNER JOIN blocks b ON b.id = e.block_id
            INNER JOIN programs p ON p.id = b.program_id
            WHERE e.student_id = :student_id AND (
                   (t.scope_type = 'department'   AND p.department_id = t.department_id
                                                  AND (t.year_level IS NULL OR b.year_level = t.year_level))
                OR (t.scope_type = 'program'      AND b.program_id = t.program_id)
                OR (t.scope_type = 'year_level'   AND b.year_level = t.year_level)
                OR (t.scope_type = 'program_year' AND b.program_id = t.program_id AND b.year_level = t.year_level)
                OR (t.scope_type = 'section'      AND b.id = t.block_id)
            )
        )
    )";

    // Every student an announcement reaches, for its notifications.
    public function announcementRecipients(int $announcementId): array {
        $school = $this->pdo->prepare("
            SELECT 1 FROM announcement_targets WHERE announcement_id = :id AND scope_type = 'school'
        ");
        $school->execute([':id' => $announcementId]);
        if ($school->fetchColumn()) {
            $stmt = $this->pdo->query("SELECT id FROM users WHERE role = 'student'");
            return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        }
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT e.student_id
            FROM announcement_targets t
            INNER JOIN enrollments e ON e.block_id IS NOT NULL
            INNER JOIN blocks b ON b.id = e.block_id
            INNER JOIN programs p ON p.id = b.program_id
            WHERE t.announcement_id = :id AND (
                   (t.scope_type = 'department'   AND p.department_id = t.department_id
                                                  AND (t.year_level IS NULL OR b.year_level = t.year_level))
                OR (t.scope_type = 'program'      AND b.program_id = t.program_id)
                OR (t.scope_type = 'year_level'   AND b.year_level = t.year_level)
                OR (t.scope_type = 'program_year' AND b.program_id = t.program_id AND b.year_level = t.year_level)
                OR (t.scope_type = 'section'      AND b.id = t.block_id)
            )
        ");
        $stmt->execute([':id' => $announcementId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // Full name of a user, for "Uploaded by" and post authors.
    public function userNames(array $userIds): array {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($userIds === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $this->pdo->prepare("SELECT id, first_name, last_name FROM users WHERE id IN ($marks)");
        $stmt->execute($userIds);
        $names = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $names[(int) $row['id']] = trim($row['first_name'] . ' ' . $row['last_name']);
        }
        return $names;
    }
}
