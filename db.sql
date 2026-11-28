-- =====================================================================
-- EduMeet : merged schema
-- Merges: edu_meet_db_1.sql (core/auth) + attendanceDB.sql (academic/attendance)
--         + edumeet_mysql_schema_fixed.sql (activities / quizzes / grading)
--         + message.txt (flashcard reviewer)
-- Target: MariaDB 10.4+ / MySQL 8 (XAMPP-compatible)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `EduMeet`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `EduMeet`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- PART 1: CORE / AUTH  (from edu_meet_db_1.sql)
-- =====================================================================

CREATE TABLE `schools` (
  `school_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `email` varchar(256) NOT NULL,
  `location` varchar(255) NOT NULL,
  `slug` varchar(128) DEFAULT NULL,
  `status` tinyint(3) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`school_id`),
  UNIQUE KEY `uq_schools_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `departments` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(32) NOT NULL,
  `status` tinyint(3) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_departments_school_slug` (`school_id`,`slug`),
  KEY `idx_departments_school_id` (`school_id`),
  CONSTRAINT `fk_departments_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(3) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_memberships` (
  `membership_id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `status` tinyint(3) NOT NULL DEFAULT 1,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`membership_id`),
  UNIQUE KEY `uq_school_user` (`school_id`,`user_id`),
  KEY `idx_school_memberships_user_id` (`user_id`),
  KEY `idx_school_memberships_school_id` (`school_id`),
  KEY `idx_school_memberships_role_id` (`role_id`),
  KEY `fk_school_memberships_department` (`department_id`),
  CONSTRAINT `fk_school_memberships_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_school_memberships_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  CONSTRAINT `fk_school_memberships_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`),
  CONSTRAINT `fk_school_memberships_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `user_role_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_role_id`),
  UNIQUE KEY `unique_user_role` (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTE: expires_at was "timestamp ... ON UPDATE current_timestamp()" in the original,
-- which silently resets the expiry whenever the row is updated (e.g. is_used = 1).
-- Changed to a plain DATETIME so the expiry stays fixed.
CREATE TABLE `password_resets` (
  `reset_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`reset_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refresh_tokens` (
  `token_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- PART 2: ACADEMIC STRUCTURE + ATTENDANCE  (from attendanceDB.sql)
-- =====================================================================

CREATE TABLE `programs` (
  `program_id` INT AUTO_INCREMENT PRIMARY KEY,
  `department_id` INT NOT NULL,
  `program_name` VARCHAR(150) NOT NULL,
  `program_code` VARCHAR(30) NOT NULL,
  `status` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`department_id`, `program_code`),
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `program_chair_assignments` (
  `assignment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `membership_id` INT NOT NULL UNIQUE,
  `program_id` INT NOT NULL UNIQUE,
  `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`membership_id`) REFERENCES `school_memberships`(`membership_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`program_id`) REFERENCES `programs`(`program_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `blocks` (
  `block_id` INT AUTO_INCREMENT PRIMARY KEY,
  `program_id` INT NOT NULL,
  `block_name` VARCHAR(50) NOT NULL,
  `year_level` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`program_id`, `block_name`),
  FOREIGN KEY (`program_id`) REFERENCES `programs`(`program_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `block_students` (
  `block_student_id` INT AUTO_INCREMENT PRIMARY KEY,
  `block_id` INT NOT NULL,
  `membership_id` INT NOT NULL,
  UNIQUE (`block_id`, `membership_id`),
  FOREIGN KEY (`block_id`) REFERENCES `blocks`(`block_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`membership_id`) REFERENCES `school_memberships`(`membership_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subjects` (
  `subject_id` INT AUTO_INCREMENT PRIMARY KEY,
  `program_id` INT NULL,
  `subject_code` VARCHAR(30) NOT NULL UNIQUE,
  `subject_name` VARCHAR(150) NOT NULL,
  `subject_type` ENUM('Major', 'Minor', 'General') DEFAULT 'General',
  `units` INT DEFAULT 3,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`program_id`) REFERENCES `programs`(`program_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `classes` (
  `class_id` INT AUTO_INCREMENT PRIMARY KEY,
  `subject_id` INT NOT NULL,
  `professor_membership_id` INT NULL,
  `class_name` VARCHAR(100) NOT NULL,
  `room` VARCHAR(100) DEFAULT 'TBA',
  `schedule_day` VARCHAR(100) NULL,
  `schedule_time` VARCHAR(100) NULL,
  `academic_year` VARCHAR(20) NOT NULL,
  `semester` VARCHAR(30) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`subject_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`professor_membership_id`) REFERENCES `school_memberships`(`membership_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `class_blocks` (
  `class_block_id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `block_id` INT NOT NULL,
  UNIQUE (`class_id`, `block_id`),
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`block_id`) REFERENCES `blocks`(`block_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `class_students` (
  `class_student_id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `membership_id` INT NOT NULL,
  UNIQUE (`class_id`, `membership_id`),
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`membership_id`) REFERENCES `school_memberships`(`membership_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `attendance` (
  `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `student_membership_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `status` ENUM('Present', 'Absent', 'Late') DEFAULT 'Present',
  `remarks` VARCHAR(255) NULL,
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (`class_id`, `student_membership_id`, `attendance_date`),
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`student_membership_id`) REFERENCES `school_memberships`(`membership_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- PART 3: ACTIVITIES / QUIZZES / EXAMS & SCORE TRACKER
-- (from edumeet_mysql_schema_fixed.sql)
-- faculty_id, student_id and class_id are plain application IDs (no FKs);
-- see the OPTIONAL section at the bottom for ways to link them.
-- =====================================================================

-- 3.1 ACTIVITIES
CREATE TABLE `activities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `course_name` VARCHAR(180) NOT NULL,
    `course_code` VARCHAR(60) NOT NULL,
    `passing_grade_percent` DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    `question_and_answer` JSON NOT NULL DEFAULT (JSON_ARRAY()),
    `faculty_id` INT NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_activities_faculty` (`faculty_id`),
    KEY `idx_activities_status_type` (`status`, `type`),
    CONSTRAINT `chk_activities_type`
        CHECK (`type` IN ('QUIZ', 'EXAM')),
    CONSTRAINT `chk_activities_status`
        CHECK (`status` IN ('draft', 'published', 'archived')),
    CONSTRAINT `chk_activities_passing_grade`
        CHECK (`passing_grade_percent` >= 0 AND `passing_grade_percent` <= 100),
    CONSTRAINT `chk_activities_question_array`
        CHECK (JSON_TYPE(`question_and_answer`) = 'ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. ACTIVITY TARGETS
-- -----------------------------------------------------------------------------
CREATE TABLE `activity_targets` (
    `activity_id` BIGINT NOT NULL,
    `class_id` INT NOT NULL,
    `class_name` VARCHAR(180) NULL,
    `class_code` VARCHAR(60) NULL,
    PRIMARY KEY (`activity_id`, `class_id`),
    KEY `idx_activity_targets_class` (`class_id`),
    CONSTRAINT `fk_activity_targets_activity`
        FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. ACTIVITY SESSIONS
-- active_session_marker is generated from STATUS ONLY (not activity_id).
-- This avoids MySQL's restriction on cascading FKs using the base column of a
-- stored generated column. The unique key allows only one in_progress session
-- per activity; ended sessions have NULL markers, and multiple NULLs are valid.
-- -----------------------------------------------------------------------------
CREATE TABLE `activity_sessions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `activity_id` BIGINT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    `started_by_faculty_id` INT NOT NULL,
    `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ended_at` DATETIME(6) NULL,
    `ended_by_faculty_id` INT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `active_session_marker` TINYINT
        GENERATED ALWAYS AS (
            CASE WHEN `status` = 'in_progress' THEN 1 ELSE NULL END
        ) STORED,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_activity_session_pair` (`id`, `activity_id`),
    UNIQUE KEY `uq_one_live_session_per_activity` (`activity_id`, `active_session_marker`),
    KEY `idx_activity_sessions_activity` (`activity_id`, `started_at` DESC),
    CONSTRAINT `fk_activity_sessions_activity`
        FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `chk_activity_sessions_status`
        CHECK (`status` IN ('in_progress', 'ended_by_faculty', 'cancelled')),
    CONSTRAINT `chk_session_end_state`
        CHECK (
            (`status` = 'in_progress' AND `ended_at` IS NULL)
            OR
            (`status` <> 'in_progress' AND `ended_at` IS NOT NULL)
        ),
    CONSTRAINT `chk_manual_end_faculty`
        CHECK (`status` <> 'ended_by_faculty' OR `ended_by_faculty_id` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. STUDENT ANSWERS
-- -----------------------------------------------------------------------------
CREATE TABLE `student_answers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `activity_id` BIGINT NOT NULL,
    `session_id` BIGINT NOT NULL,
    `student_id` INT NOT NULL,
    `answer` JSON NOT NULL DEFAULT (JSON_ARRAY()),
    `submission_status` VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    `grading_status` VARCHAR(24) NOT NULL DEFAULT 'not_graded',
    `objective_score` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `essay_score` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `score` DECIMAL(8,2) NULL,
    `max_score` DECIMAL(8,2) NULL,
    `grade_percent` DECIMAL(5,2) NULL,
    `is_passed` BOOLEAN NULL,
    `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `last_saved_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `submitted_at` DATETIME(6) NULL,
    `graded_at` DATETIME(6) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_student_attempt_per_session` (`session_id`, `student_id`),
    KEY `idx_student_answers_student` (`student_id`, `submitted_at` DESC),
    KEY `idx_student_answers_activity` (`activity_id`, `session_id`),
    KEY `idx_student_answers_grading` (`grading_status`, `submission_status`),
    CONSTRAINT `fk_student_answer_session_activity`
        FOREIGN KEY (`session_id`, `activity_id`)
        REFERENCES `activity_sessions` (`id`, `activity_id`)
        ON DELETE CASCADE,
    CONSTRAINT `chk_student_answers_answer_array`
        CHECK (JSON_TYPE(`answer`) = 'ARRAY'),
    CONSTRAINT `chk_student_answers_submission_status`
        CHECK (`submission_status` IN ('in_progress', 'submitted', 'auto_submitted')),
    CONSTRAINT `chk_student_answers_grading_status`
        CHECK (`grading_status` IN ('not_graded', 'pending_essay_review', 'graded')),
    CONSTRAINT `chk_student_answers_objective_score`
        CHECK (`objective_score` >= 0),
    CONSTRAINT `chk_student_answers_essay_score`
        CHECK (`essay_score` >= 0),
    CONSTRAINT `chk_submission_timestamp`
        CHECK (
            (`submission_status` = 'in_progress' AND `submitted_at` IS NULL)
            OR
            (`submission_status` <> 'in_progress' AND `submitted_at` IS NOT NULL)
        ),
    CONSTRAINT `chk_score_values`
        CHECK (
            (`score` IS NULL AND `max_score` IS NULL)
            OR
            (`score` IS NOT NULL AND `max_score` IS NOT NULL
                AND `score` >= 0 AND `max_score` >= `score`)
        ),
    CONSTRAINT `chk_grade_percent`
        CHECK (`grade_percent` IS NULL OR (`grade_percent` >= 0 AND `grade_percent` <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. ESSAY GRADES
-- -----------------------------------------------------------------------------
CREATE TABLE `essay_grades` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_answer_id` BIGINT NOT NULL,
    `question_id` VARCHAR(100) NOT NULL,
    `max_points` DECIMAL(8,2) NOT NULL,
    `points_awarded` DECIMAL(8,2) NOT NULL,
    `feedback` TEXT NULL,
    `graded_by_faculty_id` INT NOT NULL,
    `graded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_essay_grade_per_question` (`student_answer_id`, `question_id`),
    KEY `idx_essay_grades_answer` (`student_answer_id`),
    CONSTRAINT `fk_essay_grades_student_answer`
        FOREIGN KEY (`student_answer_id`) REFERENCES `student_answers` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `chk_essay_max_points`
        CHECK (`max_points` >= 0),
    CONSTRAINT `chk_essay_points_awarded`
        CHECK (`points_awarded` >= 0),
    CONSTRAINT `chk_essay_points_not_over_max`
        CHECK (`points_awarded` <= `max_points`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. SCORE TRACKER VIEWS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `activity_session_score_summary` AS
SELECT
    s.`id` AS `session_id`,
    a.`id` AS `activity_id`,
    a.`name` AS `activity_name`,
    a.`type` AS `activity_type`,
    s.`status` AS `session_status`,
    s.`started_at`,
    s.`ended_at`,
    COUNT(sa.`id`) AS `total_attempts`,
    COALESCE(SUM(CASE
        WHEN sa.`submission_status` IN ('submitted', 'auto_submitted') THEN 1
        ELSE 0
    END), 0) AS `submitted_count`,
    COALESCE(SUM(CASE
        WHEN sa.`grading_status` = 'graded' THEN 1
        ELSE 0
    END), 0) AS `fully_graded_count`,
    COALESCE(SUM(CASE WHEN sa.`is_passed` = TRUE THEN 1 ELSE 0 END), 0) AS `passed_count`,
    COALESCE(SUM(CASE WHEN sa.`is_passed` = FALSE THEN 1 ELSE 0 END), 0) AS `failed_count`,
    ROUND(AVG(sa.`grade_percent`), 2) AS `average_grade_percent`
FROM `activity_sessions` s
JOIN `activities` a ON a.`id` = s.`activity_id`
LEFT JOIN `student_answers` sa ON sa.`session_id` = s.`id`
GROUP BY s.`id`, a.`id`, a.`name`, a.`type`, s.`status`, s.`started_at`, s.`ended_at`;

CREATE OR REPLACE VIEW `student_activity_scores` AS
SELECT
    sa.`id` AS `student_answer_id`,
    sa.`student_id`,
    sa.`activity_id`,
    sa.`session_id`,
    a.`name` AS `activity_name`,
    a.`type` AS `activity_type`,
    a.`course_name`,
    a.`course_code`,
    sa.`score`,
    sa.`max_score`,
    sa.`grade_percent`,
    sa.`is_passed`,
    sa.`submission_status`,
    sa.`grading_status`,
    sa.`submitted_at`,
    sa.`graded_at`
FROM `student_answers` sa
JOIN `activities` a ON a.`id` = sa.`activity_id`;

-- =====================================================================
-- PART 4: FLASHCARD REVIEWER  (from message.txt)
-- The original flashcard `classes` table was dropped because `classes`
-- already exists in Part 2. Decks now point at classes(class_id) instead.
-- =====================================================================

CREATE TABLE `decks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_deck_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `flashcards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `deck_id` INT NOT NULL,
  `question` TEXT NOT NULL,
  `answer` TEXT NOT NULL,
  `explanation` TEXT NULL,
  `difficulty` ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  `position` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_flashcard_deck` FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `deck_id` INT NOT NULL,
  `total_questions` INT DEFAULT 0,
  `correct_answers` INT DEFAULT 0,
  `incorrect_answers` INT DEFAULT 0,
  `score_percentage` DECIMAL(5,2) DEFAULT 0,
  `status` ENUM('ongoing', 'completed', 'abandoned') DEFAULT 'ongoing',
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  CONSTRAINT `fk_session_deck` FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `study_session_answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `flashcard_id` INT NULL,
  `question_snapshot` TEXT NOT NULL,
  `correct_answer_snapshot` TEXT NOT NULL,
  `user_answer` TEXT NULL,
  `is_correct` BOOLEAN DEFAULT FALSE,
  `answered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_answer_session` FOREIGN KEY (`session_id`) REFERENCES `study_sessions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_answer_flashcard` FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- OPTIONAL: tie Part 3 to the rest of the schema once you decide how
-- faculty_id / student_id / class_id map (users vs memberships).
-- Left off because the original dumps never declared these links.
-- =====================================================================
-- ALTER TABLE activity_targets ADD CONSTRAINT fk_targets_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE;
-- ALTER TABLE activities       ADD CONSTRAINT fk_activities_user FOREIGN KEY (faculty_id) REFERENCES users(user_id);
-- ALTER TABLE student_answers  ADD CONSTRAINT fk_answers_user    FOREIGN KEY (student_id) REFERENCES users(user_id);

SET FOREIGN_KEY_CHECKS = 1;