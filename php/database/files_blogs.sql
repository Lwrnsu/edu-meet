-- ============================================================
--  EduMeet · Group 7 · File Management & Blogs
--  MySQL schema for class resources, post attachments and posts.
--
--  These tables point at tables owned by other groups:
--    users (id, first_name, last_name, role)
--    classes (id, faculty_id, department_id)
--    blocks (id, name)
--    enrollments (student_id, class_id, block_id)
--    deans (id, department_id)        -- deans.id = users.id
--  Their foreign keys are left as comments until those tables exist,
--  so this file can be loaded on its own.
-- ============================================================

-- Every uploaded file. A file is either a class resource
-- (context = 'resource', shared with everyone enrolled in the class)
-- or an attachment on a post (context = 'attachment', follows the post's audience).
CREATE TABLE IF NOT EXISTS class_files (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    class_id       INT          NOT NULL,             -- FK classes(id)
    uploaded_by    INT          NOT NULL,             -- FK users(id)
    context        ENUM('resource', 'attachment') NOT NULL DEFAULT 'resource',
    post_id        INT          NULL,                 -- set when context = 'attachment'
    display_name   VARCHAR(255) NOT NULL,             -- name shown in the table ("Lesson 1")
    original_name  VARCHAR(255) NOT NULL,             -- name of the file the user uploaded
    stored_name    CHAR(32)     NOT NULL UNIQUE,      -- random name on disk
    extension      VARCHAR(10)  NOT NULL,
    mime_type      VARCHAR(100) NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_class_files_class (class_id, context),
    INDEX idx_class_files_post (post_id)
);


-- Announcements and blogs posted in a class feed.
-- Both are published as soon as they are posted (no approval step).
CREATE TABLE IF NOT EXISTS posts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    class_id     INT          NOT NULL,               -- FK classes(id)
    author_id    INT          NOT NULL,               -- FK users(id)
    type         ENUM('announcement', 'blog') NOT NULL,
    title        VARCHAR(150) NOT NULL,
    message      TEXT         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_posts_feed (class_id, created_at)
);

-- Which blocks can see a post. No rows = every block in the class.
CREATE TABLE IF NOT EXISTS post_audience (
    post_id   INT NOT NULL,
    block_id  INT NOT NULL,                           -- FK blocks(id)
    PRIMARY KEY (post_id, block_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Bell notifications: one row per person who should be told.
-- type: announcement | blog | resource
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,                -- FK users(id), who sees it
    type        VARCHAR(20)  NOT NULL,
    title       VARCHAR(100) NOT NULL,                -- "New announcement"
    message     VARCHAR(255) NOT NULL,                -- "Class Suspension · Graphics..."
    link        VARCHAR(255) NOT NULL,                -- page to open when clicked
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id, is_read, created_at)
);
