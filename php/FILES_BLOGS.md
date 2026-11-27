# Group 7 · File Management & Blogs (back end)

PHP back end for the **Resources** tab, the **Class Feed** tab (announcements and blogs),
the school-wide **dashboard announcements** (ported from MANGALINDAN's module)
and the **notification bell**. It returns JSON only (`ApiResponse`:
`{ response, code, message, body }`) or the file itself. The screens are built in React.

## Files

```
api/            resources.php, posts.php, notifications.php,
                announcements.php (school-wide dashboard)    endpoints the front end calls
controllers/    ResourceController, PostController, NotificationController, AnnouncementController
models/         ClassFile, Post, Notification, Announcement   (ApiResponse is the shared one)
services/       FileStorage   checks and saves uploads
                ClassAccess   who can do what; the ONLY file that reads other groups' tables
                Notifier      who gets notified (other modules can call notifyClass())
                AnnouncementScope  who may send a school announcement to whom
helpers/        CurrentUser (reads the login from the session), Http (JSON + file streaming)
database/       files_blogs.sql, announcements.sql   this module's tables
storage/        uploaded files (not in git; blocked from direct access on Apache)
tests/          files_blogs_test.php, announcements_test.php
```

The database connection is the team's `config/Database.php`.

## Setup

1. Import `database/files_blogs.sql`, then `database/announcements.sql`, into the `EduMeet` MySQL database.
2. The module reads these tables owned by other groups (only these columns):
   `users(id, first_name, last_name, role)`, `classes(id, name, faculty_id, department_id)`,
   `departments(id, code, name)`, `programs(id, department_id, code, name)`,
   `blocks(id, program_id, year_level, section, name)`, `enrollments(student_id, class_id, block_id)`,
   `deans(id, department_id)`, `program_chairs(id, program_id)`.
   If the real names differ, change the queries in `services/ClassAccess.php`.
3. **Login:** after a user logs in, the Authentication module must set
   `$_SESSION['user_id']` and `$_SESSION['role']`
   (`student`, `faculty`, `program_chair`, `dean`, `college_admin`, `system_admin`).
   Without them every call returns 401. The API never trusts a `user_id` or `role` sent in the request.
4. PHP must allow 25 MB uploads: `upload_max_filesize=25M`, `post_max_size=60M`, `max_file_uploads=10`,
   with the `pdo_mysql` extension enabled.

## Endpoints

| Endpoint | Calls |
|---|---|
| `api/resources.php` | `GET ?class_id=&search=&type=` list · `GET ?id=` details · `GET ?id=&action=view` or `download` (file) · `POST` multipart `class_id`, `files[]` upload · `POST ?id=&action=update` (`name`) rename · `DELETE ?id=` · `GET ?action=blocks&class_id=` sections tree for the post audience picker |
| `api/posts.php` | `GET ?class_id=&page=&type=&section=` feed (10 per page) · `GET ?id=` one post · `POST` multipart `class_id, title, type, message, blocks[], files[]` create · `POST ?id=&action=update` (+ `remove_files[]`) edit · `DELETE ?id=` |
| `api/announcements.php` | School-wide (dashboard). `GET ?page=&status=&mine=1` feed (pinned first, 10 per page) · `GET ?id=` one · `GET ?id=&action=view` or `download` (attachment) · `GET ?action=targets` audience choices for me · `POST` multipart or JSON `title, body, targets[], is_pinned, status (published\|draft), file` create · `POST ?id=&action=update` (only the fields sent; `remove_attachment=1`) edit / pin / publish / archive · `DELETE ?id=` |
| `api/notifications.php` | `GET` newest 20 + unread count · `POST ?id=&action=read` · `POST ?action=read_all` |

`type` filter for resources: `pdf`, `doc`, `slide`, `sheet`, `image`, `zip`. Post `type`: `announcement` or `blog`.

Announcement `targets[]` are tokens: `ALL_STUDENTS`, `YR:2`, `DEPT:3`, `DEPT_YR:3:2`, `PROG:8`, `PROG_YR:8:2`, `SEC:1`
(`GET ?action=targets` returns the ones the user may pick, with labels).

## Rules

- **Who manages a class:** its faculty, or the dean of its department. Students can only view.
- **Who sees a class:** its managers and enrolled students (others get 403).
- **Resources** go to everyone enrolled in the class (no target audience). Edit only renames.
- **Posts** target sections, chosen as Department → Program → Section; none chosen = all sections.
  Students without a section see only all-section posts. Attachments follow their post.
  No approval step: posts are visible right away.
- **Edit/delete a post:** its author or the department's dean.
- **School announcements** (dashboard, not tied to a class):
  - Who may send to whom: admins → anyone; dean → own department (whole, by year, its programs, its sections);
    program chair → own program (whole, by year, its sections); faculty → sections they teach. Students only read.
  - Students see published ones that reach one of their sections, or the whole school.
    Students with no section see only whole-school announcements.
  - Staff see published ones plus their own drafts/archived; admins see all.
  - Edit/delete: the author or an admin. One attachment each.
- **Files:** PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, PNG, JPG/JPEG, ZIP · max 25 MB each · 10 per upload · 5 per post.
  If one file in a batch is invalid, the whole batch is rejected.
- **Notifications:** resource upload → every enrolled student; announcement/blog → students in its sections;
  school announcement → every student it reaches, the first time it is published (not for drafts or later edits).
  The poster is never notified. Notification `link`s are page routes (`resources.php?class_id=…`,
  `feed.php?class_id=…`, `announcements.php?id=…`); the React router should map them to the right screens.

## Tests

Automated checks on a throwaway SQLite database (needs `pdo_sqlite`). From the `php` folder:

```
php tests/files_blogs_test.php      # 83 checks: resources, class posts, notifications
php tests/announcements_test.php    # 70 checks: school announcements
```
