# Group 7 · File Management & Blogs, Tasks & Activities (back end)

PHP back end for the class **Resources**, **Class Feed**, **Tasks** and **Activities** tabs,
the school-wide **announcements** page and the **notification bell**. It returns JSON only
(`ApiResponse`: `{ response, code, message, body }`) or the file itself. The screens are built in React.

## Files

```
api/            resources.php, posts.php, tasks.php, my_classes.php,
                announcements.php (school-wide), notifications.php   endpoints the front end calls
controllers/    ResourceController, PostController, TaskController,
                AnnouncementController, NotificationController
models/         ClassFile, Post, Task, Announcement, Notification   (ApiResponse is the shared one)
services/       FileStorage        checks and saves uploads
                ClassAccess        who can do what; the ONLY file that reads other groups' tables
                Notifier           who gets notified (other modules can call notifyClass())
                AnnouncementScope  who may send a school announcement to whom
helpers/        CurrentUser (who is logged in), RichText (cleans announcement HTML), Http
database/       files_blogs.sql, announcements.sql   this module's tables (same as db.sql)
storage/        uploaded files (not in git; blocked from direct access on Apache)
tests/          fixtures.php, files_blogs_test.php, announcements_test.php, tasks_test.php
```

The database connection is the team's `config/Database.php`.

## Setup

1. Import the team's `db.sql`. Our tables are in **PART 6** (`class_files`, `posts`, `post_audience`,
   `tasks`, `task_submissions`); `announcements`, `announcement_targets` and `notifications` are in PART 5.
   `database/files_blogs.sql` and `database/announcements.sql` hold the same tables on their own.
2. The module reads these tables from other groups (Classes / Users modules, all in `db.sql`):
   `users`, `school_memberships` + `roles`, `departments`, `programs`, `blocks`, `block_students`,
   `subjects`, `classes`, `class_blocks`, `class_students`, `program_chair_assignments`.
   All those queries are in `services/ClassAccess.php`.
3. **Login.** `helpers/CurrentUser.php` finds the user in this order:
   - `$_SESSION['user_id']` + `$_SESSION['role']`, if a PHP page set them;
   - otherwise the login token: `Authorization: Bearer …`, or the cookies `edu_meet_auth` / `edu_meet_access`
     that the React login stores. A PHP JWT (`config/jwt.php`) is checked locally; a Spring token is checked
     with the Spring API at `SPRING_API_URL` (default `http://127.0.0.1:8080`).
   - The role comes from the token, or else from the user's strongest school membership
     (`system_admin` > `college_admin` > `college_dean` > `program_chair` > `faculty` > `student`).
   The API never trusts a `user_id` or `role` sent in the request. Not logged in → 401.
4. PHP must allow 25 MB uploads: `upload_max_filesize=25M`, `post_max_size=60M`, `max_file_uploads=10`,
   with `pdo_mysql` and `mbstring` enabled.
5. Task deadlines use `APP_TIMEZONE` (default `Asia/Manila`).

## Endpoints

| Endpoint | Calls |
|---|---|
| `api/my_classes.php` | `GET` my classes + me `{id, name, role}` · `GET ?id=` one class (name, subject code, room, schedule, term) + `can_manage` |
| `api/resources.php` | `GET ?class_id=&search=&type=` list · `GET ?id=` details · `GET ?id=&action=view` or `download` (file) · `POST` multipart `class_id`, `files[]` upload · `POST ?id=&action=update` (`name`) rename · `DELETE ?id=` · `GET ?action=blocks&class_id=` sections of the class |
| `api/posts.php` | `GET ?class_id=&page=&type=&section=` feed (10 per page) · `GET ?id=` one post · `POST` multipart `class_id, title, type, message, blocks[], files[]` create · `POST ?id=&action=update` (+ `remove_files[]`) edit · `DELETE ?id=` |
| `api/tasks.php` | `GET ?class_id=&search=` Tasks tab list · `GET ?id=` one task (+ my work, or every student's work for faculty) · `GET ?id=<task>&action=file&kind=attachment[&view=1]` or `GET ?id=<submission>&action=file&kind=submission[&view=1]` file · `POST` multipart `class_id, title, instructions, deadline, max_score, file` create · `POST ?id=&action=update` (+ `is_closed`, `remove_attachment`) · `POST ?id=&action=submit` (`file`) hand in / replace · `POST ?id=&action=unsubmit` · `POST ?action=grade&submission_id=` JSON `{score, feedback}` · `DELETE ?id=` |
| `api/announcements.php` | School-wide. `GET ?page=&status=&mine=1` feed (pinned first, 10 per page) · `GET ?id=` one (also marks its notification read) · `GET ?id=&action=view` or `download` (attachment) · `GET ?action=targets` audience choices for me · `POST` multipart or JSON `title, body, targets[], is_pinned, status (published\|draft), file` create · `POST ?id=&action=update` (only the fields sent; `remove_attachment=1`) · `DELETE ?id=` |
| `api/notifications.php` | `GET` newest 20 + unread count · `POST ?id=&action=read` · `POST ?action=read_all` |

Resource `type` filter: `pdf`, `doc`, `slide`, `sheet`, `image`, `zip`. Post `type`: `announcement` or `blog`.

Announcement `targets[]` are tokens: `ALL_STUDENTS`, `YR:2`, `DEPT:3`, `DEPT_YR:3:2`, `PROG:8`, `PROG_YR:8:2`, `SEC:5`
(`SEC:` is a `blocks.block_id`; `GET ?action=targets` returns the ones the user may pick, with labels).
Announcement `body` may be rich text (HTML from the editor). `helpers/RichText.php` keeps only safe tags
(paragraphs, headings, bold/italic/underline/strike, lists, links, colour and size) before saving and again
when sending `body_html`; plain text is escaped.

## Rules

- **Who manages a class:** its professor, or the dean of the subject's department. Students only view.
- **Who sees a class:** managers and its students (from `class_blocks` + `block_students`, or `class_students`
  for irregular students). Others get 403. Program chairs see their program's classes.
- **Resources** go to everyone in the class. Edit only renames.
- **Posts** target sections of the class; none chosen = all sections. "No Class" on the banner posts one.
- **Tasks** (Tasks + Activities tabs):
  - Managers create, edit, close/reopen and delete tasks (name, instructions, deadline, points 1–1000, one attachment).
  - A task is *Active* until its deadline or until the teacher closes it, then *Closed*.
  - Students hand in one file (replace or remove it until it is graded). Late = after the deadline while still open.
  - Remarks: *Pending* (open, nothing handed in) · *Submitted* · *Missing* (closed, nothing handed in).
  - Faculty see "x/y Submitted", every student's file, and give a score (0–max) with feedback.
    Replacing a file clears its score.
  - Group 5 (Quiz & Exam) owns the `activities` tables; tasks are separate.
- **School announcements:**
  - Who may send to whom: admins → anyone; college dean → own department (whole, by year, its programs, its sections);
    program chair → own program (whole, by year, its sections); faculty → sections they teach. Students only read.
  - Students see published ones that reach one of their sections, or the whole school.
  - Staff see published ones plus their own drafts/archived; admins see all.
  - Edit/delete: the author or an admin. One attachment each.
- **Files:** PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, PNG, JPG/JPEG, ZIP · max 25 MB each · 10 per upload · 5 per post.
- **Notifications:**
  - resource upload → every student of the class; class post → students in its sections;
  - new task → every student of the class; work handed in → the professor; score given → that student;
  - school announcement → every student it reaches, the first time it is published.
  - The sender is never notified. `link`s are page routes (`resources.php?class_id=…`, `feed.php?class_id=…`,
    `tasks.php?class_id=…&task_id=…`, `announcements.php?id=…`); `utils/format.js` maps them to React routes.

## Tests

Automated checks on a throwaway SQLite copy of the `db.sql` tables (needs `pdo_sqlite`). From the `php` folder:

```
php tests/files_blogs_test.php      # resources, class posts, notifications
php tests/announcements_test.php    # school announcements
php tests/tasks_test.php            # tasks, hand in, grading, remarks
```

## Front end (React)

The screens are in `frontend/edu-meet/src/features/files-and-posts/` (routes in `App.jsx`):

| Route | Screens |
|---|---|
| `/classes` | My classes (cards); "Back to Classes" goes here |
| `/classes/:classId/feed` | Class Feed: posts, Load more, create/edit with sections, delete |
| `/classes/:classId/tasks` | Tasks: faculty table (deadline, x/y Submitted, Active/Closed, edit/delete, + Add Task); student table (file submitted, date, score, Pending/Submitted/Missing) |
| `/classes/:classId/activities[/:taskId]` | Activities: task cards; task details with hand in (students) or submissions + grading (faculty) |
| `/classes/:classId/resources[/:fileId]` | Resources tab and View File |
| `/announcements` | Announcements: list + reading panel, attachment View/Download, + New Announcement (audience chips, rich-text editor, pin, attachment) |

Every page has the left side bar (`SideRail`): logo, **Classes** (pop-out list of my classes), **Announcements**,
the **notification bell** (unread badge, Read/Unread list, Mark all as read) and **Profile** (name, role, Log out).
New notifications also pop up as in-app alerts (bottom-left) and refresh the open Tasks/Activities page.
On phones the side bar moves to the bottom.

React calls PHP at `/php/...` (change with `VITE_PHP_API_URL`) and sends the login token as a Bearer header.
In development `vite.config.js` forwards `/php` to `VITE_PHP_TARGET` (default `http://php:8000`);
in production the `Caddyfile` does the same.
