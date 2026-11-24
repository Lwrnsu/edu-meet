-- Edu-Meet LMS - Group 7 Announcements Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS departments (
    department_id   BIGSERIAL PRIMARY KEY,
    department_code VARCHAR(30) NOT NULL UNIQUE,
    department_name VARCHAR(140) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_department_code_not_blank
        CHECK (LENGTH(TRIM(department_code)) > 0),
    CONSTRAINT chk_department_name_not_blank
        CHECK (LENGTH(TRIM(department_name)) > 0)
);

CREATE TABLE IF NOT EXISTS programs (
    program_id      BIGSERIAL PRIMARY KEY,
    department_id   BIGINT NOT NULL,
    program_code    VARCHAR(40) NOT NULL UNIQUE,
    program_name    VARCHAR(150) NOT NULL,
    max_years       SMALLINT NOT NULL DEFAULT 4,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_program_code_not_blank
        CHECK (LENGTH(TRIM(program_code)) > 0),
    CONSTRAINT chk_program_name_not_blank
        CHECK (LENGTH(TRIM(program_name)) > 0),
    CONSTRAINT chk_program_max_years
        CHECK (max_years BETWEEN 1 AND 4),
    CONSTRAINT fk_programs_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sections (
    section_id      BIGSERIAL PRIMARY KEY,
    section_code    VARCHAR(30) NOT NULL UNIQUE,
    section_name    VARCHAR(120) NOT NULL,
    year_level      SMALLINT NOT NULL DEFAULT 1,
    program_id      BIGINT NOT NULL,
    department_id   BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_section_code_not_blank
        CHECK (LENGTH(TRIM(section_code)) > 0),
    CONSTRAINT chk_section_name_not_blank
        CHECK (LENGTH(TRIM(section_name)) > 0),
    CONSTRAINT chk_section_year_level
        CHECK (year_level BETWEEN 1 AND 4),
    CONSTRAINT fk_sections_program
        FOREIGN KEY (program_id)
        REFERENCES programs(program_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sections_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    user_id         BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    role            VARCHAR(30) NOT NULL,
    section_id      BIGINT DEFAULT NULL,
    year_level      SMALLINT DEFAULT NULL,
    program_id      BIGINT DEFAULT NULL,
    department_id   BIGINT DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_user_full_name_not_blank
        CHECK (LENGTH(TRIM(full_name)) > 0),
    CONSTRAINT chk_user_role
        CHECK (role IN ('student', 'faculty', 'program_chair', 'dean', 'admin')),
    CONSTRAINT chk_user_year_level
        CHECK (year_level IS NULL OR year_level BETWEEN 1 AND 4),
    CONSTRAINT fk_users_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_users_program
        FOREIGN KEY (program_id)
        REFERENCES programs(program_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faculty_sections (
    user_id         BIGINT NOT NULL,
    section_id      BIGINT NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, section_id),
    CONSTRAINT fk_faculty_sections_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_faculty_sections_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS announcements (
    announcement_id   BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL,
    role              VARCHAR(30) NOT NULL,
    title             VARCHAR(180) NOT NULL,
    body              TEXT NOT NULL,
    is_pinned         BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_name   TEXT DEFAULT NULL,
    attachment_url    TEXT DEFAULT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'published',
    published_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_announcement_title_not_blank
        CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT chk_announcement_body_not_blank
        CHECK (LENGTH(TRIM(body)) > 0),
    CONSTRAINT chk_announcement_status
        CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_announcement_role
        CHECK (role IN ('admin', 'dean', 'program_chair', 'faculty')),
    CONSTRAINT fk_announcements_author
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcement_targets (
    target_id         BIGSERIAL PRIMARY KEY,
    announcement_id   BIGINT NOT NULL,
    scope_type        VARCHAR(20) NOT NULL,
    department_id     BIGINT DEFAULT NULL,
    program_id        BIGINT DEFAULT NULL,
    year_level        SMALLINT DEFAULT NULL,
    section_id        BIGINT DEFAULT NULL,

    CONSTRAINT chk_scope_type
        CHECK (scope_type IN ('school', 'department', 'program', 'year_level', 'program_year', 'section')),
    CONSTRAINT fk_announcement_targets_announcement
        FOREIGN KEY (announcement_id)
        REFERENCES announcements(announcement_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_announcement_targets_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_announcement_targets_program
        FOREIGN KEY (program_id)
        REFERENCES programs(program_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_announcement_targets_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id   BIGSERIAL PRIMARY KEY,
    recipient_id      BIGINT NOT NULL,
    announcement_id   BIGINT NOT NULL,
    title             VARCHAR(180) NOT NULL,
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    read_at           TIMESTAMPTZ DEFAULT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_notification_title_not_blank
        CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_announcement
        FOREIGN KEY (announcement_id)
        REFERENCES announcements(announcement_id)
        ON DELETE CASCADE
);


ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS attachment_url  TEXT DEFAULT NULL;

ALTER TABLE announcement_targets
    ADD COLUMN IF NOT EXISTS scope_type    VARCHAR(20) NOT NULL DEFAULT 'section',
    ADD COLUMN IF NOT EXISTS department_id BIGINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS program_id    BIGINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS year_level    SMALLINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS section_id    BIGINT DEFAULT NULL;

ALTER TABLE announcement_targets
    DROP CONSTRAINT IF EXISTS chk_scope_type;

ALTER TABLE announcement_targets
    ADD CONSTRAINT chk_scope_type
    CHECK (scope_type IN ('school', 'department', 'program', 'year_level', 'program_year', 'section'));

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS recipient_id  BIGINT,
    ADD COLUMN IF NOT EXISTS title         VARCHAR(180),
    ADD COLUMN IF NOT EXISTS is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS read_at       TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;


CREATE INDEX IF NOT EXISTS idx_announcements_feed
    ON announcements (status, is_pinned DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_user_id
    ON announcements (user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_targets_announcement
    ON announcement_targets (announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_targets_section
    ON announcement_targets (section_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON notifications (recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_announcement
    ON notifications (announcement_id);

CREATE INDEX IF NOT EXISTS idx_users_role_scope
    ON users (role, department_id, program_id, year_level, section_id);


INSERT INTO departments (department_id, department_code, department_name) VALUES
    (1, 'CCS',  'College of Computer Studies'),
    (2, 'CEAS', 'College of Education, Arts and Sciences'),
    (3, 'CBA',  'College of Business Administration')
ON CONFLICT (department_id) DO UPDATE
    SET department_code = EXCLUDED.department_code,
        department_name = EXCLUDED.department_name;

INSERT INTO programs (program_id, department_id, program_code, program_name, max_years) VALUES
    (10, 1, 'BSCS',      'Bachelor of Science in Computer Science', 4),
    (11, 1, 'BSIT',      'Bachelor of Science in Information Technology', 4),
    (12, 1, 'BSEMC-DAT', 'Bachelor of Science in Entertainment and Multimedia Computing - Digital Animation', 4),
    (13, 1, 'BSEMC-GD',  'Bachelor of Science in Entertainment and Multimedia Computing - Game Development', 4),
    (20, 2, 'BACOMM',    'Bachelor of Arts in Communication', 4),
    (30, 3, 'BSBA',      'Bachelor of Science in Business Administration', 4)
ON CONFLICT (program_id) DO UPDATE
    SET department_id = EXCLUDED.department_id,
        program_code  = EXCLUDED.program_code,
        program_name  = EXCLUDED.program_name,
        max_years     = EXCLUDED.max_years;

INSERT INTO sections (section_id, section_code, section_name, year_level, program_id, department_id) VALUES
    (101, 'BSCS-1A',      'BSCS 1A',      1, 10, 1),
    (102, 'BSCS-1B',      'BSCS 1B',      1, 10, 1),
    (103, 'BSCS-1C',      'BSCS 1C',      1, 10, 1),
    (104, 'BSCS-1D',      'BSCS 1D',      1, 10, 1),
    (105, 'BSCS-2A',      'BSCS 2A',      2, 10, 1),
    (106, 'BSCS-2B',      'BSCS 2B',      2, 10, 1),
    (107, 'BSCS-2C',      'BSCS 2C',      2, 10, 1),
    (108, 'BSCS-2D',      'BSCS 2D',      2, 10, 1),
    (109, 'BSCS-3A',      'BSCS 3A',      3, 10, 1),
    (110, 'BSCS-3B',      'BSCS 3B',      3, 10, 1),
    (111, 'BSCS-3C',      'BSCS 3C',      3, 10, 1),
    (112, 'BSCS-3D',      'BSCS 3D',      3, 10, 1),
    (113, 'BSCS-4A',      'BSCS 4A',      4, 10, 1),
    (114, 'BSCS-4B',      'BSCS 4B',      4, 10, 1),
    (115, 'BSCS-4C',      'BSCS 4C',      4, 10, 1),
    (116, 'BSIT-1A',      'BSIT 1A',      1, 11, 1),
    (117, 'BSIT-2A',      'BSIT 2A',      2, 11, 1),
    (118, 'BSIT-3A',      'BSIT 3A',      3, 11, 1),
    (119, 'BSIT-4A',      'BSIT 4A',      4, 11, 1),
    (120, 'BSEMC-DAT-1A', 'BSEMC-DAT 1A', 1, 12, 1),
    (121, 'BSEMC-GD-1A',  'BSEMC-GD 1A',  1, 13, 1),
    (201, 'BACOMM-1A',    'BACOMM 1A',    1, 20, 2),
    (301, 'BSBA-1A',      'BSBA 1A',      1, 30, 3)
ON CONFLICT (section_id) DO UPDATE
    SET section_code  = EXCLUDED.section_code,
        section_name  = EXCLUDED.section_name,
        year_level    = EXCLUDED.year_level,
        program_id    = EXCLUDED.program_id,
        department_id = EXCLUDED.department_id;

INSERT INTO users (user_id, full_name, email, role, section_id, year_level, program_id, department_id) VALUES
    (1001, 'Elena Santos',           'elena.santos@edumeet.edu',    'faculty',       NULL, NULL, 10,   1),
    (1002, 'Marco Reyes',            'marco.reyes@edumeet.edu',     'program_chair', NULL, NULL, 10,   1),
    (1003, 'Clarissa Mendoza',       'mendoza.dean.ccs@edumeet.edu','dean',          NULL, NULL, NULL, 1),
    (1004, 'Raya Manalo',            'manalo.admin@edumeet.edu',    'admin',         NULL, NULL, NULL, NULL),
    (2001, 'Angela Cruz',            'angela.cruz@edumeet.edu',     'student',       101,  1,    10,   1),
    (2002, 'Rafael Lim',             'rafael.lim@edumeet.edu',      'student',       101,  1,    10,   1),
    (2003, 'Bianca Navarro',         'bianca.navarro@edumeet.edu',  'student',       102,  1,    10,   1),
    (2004, 'Sofia Mendoza',          'sofia.mendoza@edumeet.edu',   'student',       103,  1,    10,   1),
    (2005, 'Liam Reyes',             'liam.reyes@edumeet.edu',      'student',       103,  1,    10,   1),
    (2006, 'Chloe Villanueva',       'chloe.villanueva@edumeet.edu','student',       104,  1,    10,   1),
    (2007, 'Noah Garcia',            'noah.garcia@edumeet.edu',     'student',       116,  1,    11,   1),
    (2008, 'Zoe Torres',             'zoe.torres@edumeet.edu',      'student',       120,  1,    12,   1),
    (2009, 'Olivia Rodriguez',       'olivia.rodriguez@edumeet.edu','student',       121,  1,    13,   1),
    (2010, 'Lucas Ramos',            'lucas.ramos@edumeet.edu',     'student',       201,  1,    20,   2),
    (2011, 'Hannah Flores',          'hannah.flores@edumeet.edu',   'student',       301,  1,    30,   3)
ON CONFLICT (user_id) DO UPDATE
    SET full_name     = EXCLUDED.full_name,
        role          = EXCLUDED.role,
        section_id    = EXCLUDED.section_id,
        year_level    = EXCLUDED.year_level,
        program_id    = EXCLUDED.program_id,
        department_id = EXCLUDED.department_id;

INSERT INTO faculty_sections (user_id, section_id) VALUES
    (1001, 101),
    (1001, 102),
    (1001, 103),
    (1001, 104)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('departments', 'department_id'), GREATEST((SELECT COALESCE(MAX(department_id), 1) FROM departments), 1));
SELECT setval(pg_get_serial_sequence('programs', 'program_id'), GREATEST((SELECT COALESCE(MAX(program_id), 1) FROM programs), 1));
SELECT setval(pg_get_serial_sequence('sections', 'section_id'), GREATEST((SELECT COALESCE(MAX(section_id), 1) FROM sections), 1));
SELECT setval(pg_get_serial_sequence('users', 'user_id'), GREATEST((SELECT COALESCE(MAX(user_id), 1) FROM users), 1));