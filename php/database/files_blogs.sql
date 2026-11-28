-- ============================================================
--  EduMeet · Group 7 · File Management & Blogs, Tasks
--  MySQL tables for class resources, post attachments, class-feed posts,
--  tasks and task submissions.
--
--  Same tables as db.sql PART 6. Load db.sql first: these point at
--  users(user_id), classes(class_id) and blocks(block_id).
--  Announcements and notifications are in db.sql PART 5.
-- ============================================================

-- Every uploaded file. A file is either a class resource
-- (context = 'resource', shared with everyone in the class)
-- or an attachment on a post (context = 'attachment', follows the post's audience).
CREATE TABLE IF NOT EXISTS `class_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `uploaded_by` int NOT NULL,
  `context` enum('resource','attachment') NOT NULL DEFAULT 'resource',
  `post_id` int NULL DEFAULT NULL,
  `display_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` char(32) NOT NULL,
  `extension` varchar(10) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size_bytes` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_class_files_stored` (`stored_name`),
  KEY `idx_class_files_class` (`class_id`, `context`),
  KEY `idx_class_files_post` (`post_id`),
  CONSTRAINT `fk_class_files_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_class_files_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Announcements and blogs posted in a class feed.
CREATE TABLE IF NOT EXISTS `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `author_id` int NOT NULL,
  `type` enum('announcement','blog') NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_posts_feed` (`class_id`, `created_at`),
  CONSTRAINT `fk_posts_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which blocks (sections) can see a post. No rows = every block in the class.
CREATE TABLE IF NOT EXISTS `post_audience` (
  `post_id` int NOT NULL,
  `block_id` int NOT NULL,
  PRIMARY KEY (`post_id`, `block_id`),
  CONSTRAINT `fk_post_audience_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_audience_block` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`block_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks of a class (Tasks / Activities tabs). Open until the deadline
-- or until the faculty closes it (is_closed = 1).
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `created_by` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `instructions` text NOT NULL,
  `max_score` int NOT NULL DEFAULT 100,
  `deadline` datetime NOT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  `attachment_original_name` varchar(255) NULL DEFAULT NULL,
  `attachment_stored_name` char(32) NULL DEFAULT NULL,
  `attachment_extension` varchar(10) NULL DEFAULT NULL,
  `attachment_mime_type` varchar(100) NULL DEFAULT NULL,
  `attachment_size_bytes` bigint NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tasks_class` (`class_id`, `deadline`),
  CONSTRAINT `fk_tasks_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One handed-in file per student per task. score is NULL until graded.
CREATE TABLE IF NOT EXISTS `task_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `student_id` int NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` char(32) NOT NULL,
  `extension` varchar(10) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size_bytes` bigint NOT NULL,
  `submitted_at` datetime NOT NULL,
  `score` decimal(7,2) NULL DEFAULT NULL,
  `feedback` text NULL,
  `graded_by` int NULL DEFAULT NULL,
  `graded_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_submissions_student` (`task_id`, `student_id`),
  UNIQUE KEY `uq_task_submissions_stored` (`stored_name`),
  CONSTRAINT `fk_task_submissions_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_task_submissions_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
