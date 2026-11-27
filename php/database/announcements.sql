-- ============================================================
--  EduMeet · Group 7 · School announcements (dashboard)
--  MySQL. Ported from MANGALINDAN's PostgreSQL version.
--
--  Reads tables owned by other groups (see services/ClassAccess.php):
--    users (id, first_name, last_name, role)
--    departments (id, code, name)
--    programs (id, department_id, code, name)
--    blocks (id, program_id, year_level, section, name)   -- "sections"
--    enrollments (student_id, class_id, block_id)
--    classes (id, faculty_id)
--    deans (id, department_id)            -- deans.id = users.id
--    program_chairs (id, program_id)      -- program_chairs.id = users.id
--  Notifications go to the notifications table in files_blogs.sql,
--  so import that file first.
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    author_id          INT          NOT NULL,          -- FK users(id)
    author_role        VARCHAR(20)  NOT NULL,          -- role when posted
    title              VARCHAR(150) NOT NULL,
    body               TEXT         NOT NULL,
    is_pinned          BOOLEAN      NOT NULL DEFAULT FALSE,
    status             ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
    -- one optional attachment, saved by services/FileStorage.php
    attachment_name    VARCHAR(255) NULL,
    attachment_stored  CHAR(32)     NULL UNIQUE,
    attachment_ext     VARCHAR(10)  NULL,
    attachment_mime    VARCHAR(100) NULL,
    attachment_size    BIGINT       NULL,
    published_at       TIMESTAMP    NULL,               -- set the first time it is published
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_announcements_feed (status, is_pinned, published_at),
    INDEX idx_announcements_author (author_id)
);

-- Who an announcement is for. One row per chosen target; it reaches a
-- student if ANY row matches one of the student's sections.
--   school        everyone                       (no ids)
--   department    department_id [+ year_level]
--   program       program_id
--   year_level    year_level (all programs)
--   program_year  program_id + year_level
--   section       block_id
CREATE TABLE IF NOT EXISTS announcement_targets (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id  INT NOT NULL,
    scope_type       ENUM('school', 'department', 'program', 'year_level', 'program_year', 'section') NOT NULL,
    department_id    INT     NULL,                        -- FK departments(id)
    program_id       INT     NULL,                        -- FK programs(id)
    year_level       TINYINT NULL,
    block_id         INT     NULL,                        -- FK blocks(id)
    INDEX idx_announcement_targets (announcement_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);
