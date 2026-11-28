-- ============================================================
--  EduMeet · Group 7 · School announcements (dashboard)
--
--  These tables are already in the team schema (db.sql, PART 5).
--  This file is only for a database built without db.sql.
--  Column names match db.sql; see services/ClassAccess.php for the
--  other groups' tables the announcements read (users, school_memberships,
--  departments, programs, blocks, block_students, program_chair_assignments).
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
    attachment_original_name    VARCHAR(255) NULL,
    attachment_stored_name  CHAR(32)     NULL UNIQUE,
    attachment_extension     VARCHAR(10)  NULL,
    attachment_mime_type    VARCHAR(100) NULL,
    attachment_size_bytes    BIGINT       NULL,
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
