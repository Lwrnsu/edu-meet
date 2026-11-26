# Group 7 · File Management & Blogs (back end)

PHP back end for the **Resources** tab, the **Class Feed** tab (announcements and blogs)
and the **notification bell** inside a class. It returns JSON only (`ApiResponse`:
`{ response, code, message, body }`) or the file itself. The screens are built in React.

## Files

```
api/            resources.php, posts.php, notifications.php   endpoints the front end calls
controllers/    ResourceController, PostController, NotificationController
models/         ClassFile, Post, Notification   (ApiResponse is the shared one)
services/       FileStorage   checks and saves uploads
                ClassAccess   who can do what; the ONLY file that reads other groups' tables
                Notifier      who gets notified (other modules can call notifyClass())
helpers/        CurrentUser (reads the login from the session), Http (JSON + file streaming)
database/       files_blogs.sql   this module's tables
storage/        uploaded files (not in git; blocked from direct access on Apache)
tests/          files_blogs_test.php
```

The database connection is the team's `config/Database.php`.

## Setup

1. Import `database/files_blogs.sql` into the `EduMeet` MySQL database.
2. The module reads these tables owned by other groups (only these columns):
   `users(id, first_name, last_name, role)`, `classes(id, name, faculty_id, department_id)`,
   `departments(id, code, name)`, `programs(id, department_id, code, name)`,
   `blocks(id, program_id, year_level, section, name)`, `enrollments(student_id, class_id, block_id)`,
   `deans(id, department_id)`. If the real names differ, change the queries in `services/ClassAccess.php`.
3. **Login:** after a user logs in, the Authentication module must set
   `$_SESSION['user_id']` and `$_SESSION['role']` (`student`, `faculty`, `dean`, `college_admin`, `system_admin`).
   Without them every call returns 401.
4. PHP must allow 25 MB uploads: `upload_max_filesize=25M`, `post_max_size=60M`, `max_file_uploads=10`,
   with the `pdo_mysql` extension enabled.

## Endpoints

| Endpoint | Calls |
|---|---|
| `api/resources.php` | `GET ?class_id=&search=&type=` list · `GET ?id=` details · `GET ?id=&action=view` or `download` (file) · `POST` multipart `class_id`, `files[]` upload · `POST ?id=&action=update` (`name`) rename · `DELETE ?id=` · `GET ?action=blocks&class_id=` sections tree for the post audience picker |
| `api/posts.php` | `GET ?class_id=&page=&type=&section=` feed (10 per page) · `GET ?id=` one post · `POST` multipart `class_id, title, type, message, blocks[], files[]` create · `POST ?id=&action=update` (+ `remove_files[]`) edit · `DELETE ?id=` |
| `api/notifications.php` | `GET` newest 20 + unread count · `POST ?id=&action=read` · `POST ?action=read_all` |

`type` filter for resources: `pdf`, `doc`, `slide`, `sheet`, `image`, `zip`. Post `type`: `announcement` or `blog`.

## Rules

- **Who manages a class:** its faculty, or the dean of its department. Students can only view.
- **Who sees a class:** its managers and enrolled students (others get 403).
- **Resources** go to everyone enrolled in the class (no target audience). Edit only renames.
- **Posts** target sections, chosen as Department → Program → Section; none chosen = all sections.
  Students without a section see only all-section posts. Attachments follow their post.
  No approval step: posts are visible right away.
- **Edit/delete a post:** its author or the department's dean.
- **Files:** PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, PNG, JPG/JPEG, ZIP · max 25 MB each · 10 per upload · 5 per post.
  If one file in a batch is invalid, the whole batch is rejected.
- **Notifications:** resource upload → every enrolled student; announcement/blog → students in its sections.
  The poster is never notified. Notification `link`s are page routes (`resources.php?class_id=…`,
  `feed.php?class_id=…`); the React router should map them to the Resources and Class Feed tabs.

## Tests

83 automated checks on a throwaway SQLite database (needs `pdo_sqlite`). From the `php` folder:

```
php tests/files_blogs_test.php
```
