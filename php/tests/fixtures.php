<?php
/*
    Test database for the Group 7 tests: an SQLite copy of the db.sql tables
    this module reads or writes (only the columns it uses), plus helpers to
    add people, sections and classes. Never touches real data.
*/

function edumeet_test_db(): PDO {
    $pdo = function_exists('edumeet_test_pdo')
        ? edumeet_test_pdo()
        : new PDO('sqlite::memory:', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    $pdo->exec("
        -- other groups' tables (db.sql PART 1 + 2)
        CREATE TABLE users (user_id INTEGER PRIMARY KEY, email TEXT, first_name TEXT, last_name TEXT, deleted_at TEXT NULL);
        CREATE TABLE roles (role_id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE school_memberships (membership_id INTEGER PRIMARY KEY, school_id INT DEFAULT 1, department_id INT NULL,
            user_id INT NOT NULL, role_id INT NOT NULL, status INT NOT NULL DEFAULT 1, deleted_at TEXT NULL);
        CREATE TABLE user_roles (user_role_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT, role_id INT);
        CREATE TABLE departments (department_id INTEGER PRIMARY KEY, school_id INT DEFAULT 1, name TEXT, slug TEXT, deleted_at TEXT NULL);
        CREATE TABLE programs (program_id INTEGER PRIMARY KEY, department_id INT, program_name TEXT, program_code TEXT);
        CREATE TABLE program_chair_assignments (assignment_id INTEGER PRIMARY KEY AUTOINCREMENT, membership_id INT, program_id INT);
        CREATE TABLE blocks (block_id INTEGER PRIMARY KEY, program_id INT, block_name TEXT, year_level INT);
        CREATE TABLE block_students (block_student_id INTEGER PRIMARY KEY AUTOINCREMENT, block_id INT, membership_id INT);
        CREATE TABLE subjects (subject_id INTEGER PRIMARY KEY, program_id INT NULL, subject_code TEXT, subject_name TEXT);
        CREATE TABLE classes (class_id INTEGER PRIMARY KEY, subject_id INT, professor_membership_id INT NULL, class_name TEXT,
            room TEXT DEFAULT 'TBA', schedule_day TEXT NULL, schedule_time TEXT NULL, academic_year TEXT DEFAULT '2026-2027',
            semester TEXT DEFAULT '1st Semester');
        CREATE TABLE class_blocks (class_block_id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INT, block_id INT);
        CREATE TABLE class_students (class_student_id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INT, membership_id INT);

        -- announcements + notifications (db.sql PART 5)
        CREATE TABLE announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INT NOT NULL, author_role TEXT NOT NULL, class_id INT NULL,
            title TEXT NOT NULL, body TEXT NOT NULL, is_pinned INT NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'published',
            attachment_original_name TEXT NULL, attachment_stored_name TEXT NULL UNIQUE, attachment_extension TEXT NULL,
            attachment_mime_type TEXT NULL, attachment_size_bytes INT NULL, published_at TEXT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE announcement_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT, announcement_id INT NOT NULL, scope_type TEXT NOT NULL, school_id INT NULL,
            department_id INT NULL, program_id INT NULL, year_level INT NULL, block_id INT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, announcement_id INT NULL, type TEXT NOT NULL,
            title TEXT NOT NULL, message TEXT NOT NULL, link TEXT NULL, is_read INT NOT NULL DEFAULT 0, read_at TEXT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

        -- this module (db.sql PART 6 = database/files_blogs.sql)
        CREATE TABLE class_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INT NOT NULL, uploaded_by INT NOT NULL,
            context TEXT NOT NULL DEFAULT 'resource', post_id INT NULL, display_name TEXT NOT NULL,
            original_name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE, extension TEXT NOT NULL,
            mime_type TEXT NOT NULL, size_bytes INT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INT NOT NULL, author_id INT NOT NULL,
            type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE post_audience (post_id INT NOT NULL, block_id INT NOT NULL, PRIMARY KEY (post_id, block_id));
        CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INT NOT NULL, created_by INT NOT NULL, title TEXT NOT NULL,
            instructions TEXT NOT NULL, max_score INT NOT NULL DEFAULT 100, deadline TEXT NOT NULL, is_closed INT NOT NULL DEFAULT 0,
            attachment_original_name TEXT NULL, attachment_stored_name TEXT NULL, attachment_extension TEXT NULL,
            attachment_mime_type TEXT NULL, attachment_size_bytes INT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE task_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INT NOT NULL, student_id INT NOT NULL,
            original_name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE, extension TEXT NOT NULL, mime_type TEXT NOT NULL,
            size_bytes INT NOT NULL, submitted_at TEXT NOT NULL, score REAL NULL, feedback TEXT NULL,
            graded_by INT NULL, graded_at TEXT NULL, UNIQUE (task_id, student_id));

        INSERT INTO roles VALUES (1, 'Student'), (2, 'Faculty'), (3, 'College Dean'), (4, 'Program Chair'),
                                 (5, 'College Admin'), (6, 'System Admin');
    ");
    return $pdo;
}

// A person with one school membership. membership_id = user_id to keep tests readable.
function add_person(PDO $pdo, int $id, string $first, string $last, string $role, ?int $departmentId = null): void {
    $roleIds = ['student' => 1, 'faculty' => 2, 'college_dean' => 3, 'program_chair' => 4, 'college_admin' => 5, 'system_admin' => 6];
    $pdo->prepare("INSERT INTO users (user_id, email, first_name, last_name) VALUES (?, ?, ?, ?)")
        ->execute([$id, "u$id@test.local", $first, $last]);
    $pdo->prepare("INSERT INTO school_memberships (membership_id, department_id, user_id, role_id) VALUES (?, ?, ?, ?)")
        ->execute([$id, $departmentId, $id, $roleIds[$role]]);
}

// [block_id => user ids]
function put_in_blocks(PDO $pdo, array $blocks): void {
    $stmt = $pdo->prepare("INSERT INTO block_students (block_id, membership_id) VALUES (?, ?)");
    foreach ($blocks as $blockId => $userIds) {
        foreach ((array) $userIds as $userId) {
            $stmt->execute([$blockId, $userId]);
        }
    }
}

// A class taught by $professorId (null = nobody), for the subject's program, with these blocks.
function add_class(PDO $pdo, int $id, string $name, ?int $professorId, int $programId, array $blockIds, array $irregularIds = []): void {
    $pdo->prepare("INSERT INTO subjects (subject_id, program_id, subject_code, subject_name) VALUES (?, ?, ?, ?)")
        ->execute([$id, $programId, "SUBJ$id", $name]);
    $pdo->prepare("INSERT INTO classes (class_id, subject_id, professor_membership_id, class_name) VALUES (?, ?, ?, ?)")
        ->execute([$id, $id, $professorId, $name]);
    foreach ($blockIds as $b) {
        $pdo->prepare("INSERT INTO class_blocks (class_id, block_id) VALUES (?, ?)")->execute([$id, $b]);
    }
    foreach ($irregularIds as $userId) {
        $pdo->prepare("INSERT INTO class_students (class_id, membership_id) VALUES (?, ?)")->execute([$id, $userId]);
    }
}
