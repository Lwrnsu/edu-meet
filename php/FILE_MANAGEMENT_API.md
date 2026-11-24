# File Management API (Tasks, Submissions, Resources)

PHP back end only, with no HTML. The React front end calls these endpoints and renders everything.

## Setup

1. Import `database/file_management.sql` into MySQL. It uses the `EduMeet` database from `config/Database.php`.
2. For local testing only, also import `database/file_management_seed.sql` (sample users and tasks).
3. Run the API from the `php` folder: `php -S localhost:8000`
   (needs the `pdo_mysql`, `fileinfo` and `zip` extensions enabled in php.ini).
4. Uploaded files are saved in `storage/uploads/` (ignored by git).

## Calling the API

- URL: `http://localhost:8000/controllers/<Controller>.php?action=<action>&...`
- Every **POST** must send the header `X-Requested-With: XMLHttpRequest`.
- POST bodies: `FormData` (needed for file uploads) or JSON (`Content-Type: application/json`).
- Send cookies: `fetch(url, { credentials: 'include' })`. Allowed front-end origin: `http://localhost:5173`.
- JSON responses use `ApiResponse`: `{ "response": true|false, "code": 200, "message": "...", "body": { ... } }`
- Download/view endpoints return the file itself. Use them as `<a href>` / `window.open` links (add `&view=1` to open PDFs, images and TXT in the browser).

**Who is calling?** `services/Auth.php` reads `$_SESSION['user_id']`. While `Auth::DEV_MODE` is `true` and nobody is
logged in, send `X-User-Id: <users.id>` (or add `&as=student` / `&as=faculty` to the URL) to test as a faculty member or a student.
Set `DEV_MODE` to `false` once the team's login is connected.

```js
const API = 'http://localhost:8000/controllers';
const post = (path, data) => fetch(`${API}/${path}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  body: data, // FormData
}).then(r => r.json());

// e.g. submit work
const fd = new FormData(); fd.append('task_id', 2); fd.append('file', fileInput.files[0]);
const res = await post('SubmissionController.php?action=submit', fd);
if (!res.response) alert(res.message);
```

## Endpoints

### TaskController.php

| Method | action | Who | Params | body |
|---|---|---|---|---|
| GET | `list` | all | | `tasks[]` (with `my_score`, `submission_count`, `student_count`, `attachment_count`), `viewer` |
| GET | `show` | all | `id` | `task`, `attachments[]`, `viewer`; student: `my_submission`, `can_submit`; faculty: `roster[]`, `stats` |
| POST | `save` | faculty | `id` (to edit), `title`, `description`, `due_date`, `max_score`, `allow_late`, `remove_attachments[]`, `attachments[]` (files) | `task` |
| POST | `delete` | faculty | `id` | |
| GET | `attachment` | all | `id`, `view=1` optional | file |
| GET | `downloadAll` | faculty | `id` | ZIP of all submissions |
| GET | `exportScores` | faculty | `id` | CSV |

### SubmissionController.php

| Method | action | Who | Params | body |
|---|---|---|---|---|
| POST | `submit` | student | `task_id`, `file` | `submission` (upload or replace; blocked once scored or closed) |
| POST | `remove` | student | `task_id` | (only while not scored) |
| POST | `score` | faculty | `id`, `score` (`''` clears it), `feedback` | `submission` |
| GET | `download` | faculty / owner | `id`, `view=1` optional | file |

### ResourceController.php

| Method | action | Who | Params | body |
|---|---|---|---|---|
| GET | `list` | all | | `resources[]`, `types[]` (for the type filter), `rules` (allowed types, max size), `viewer` |
| POST | `upload` | faculty | `files[]` | `resources[]` |
| POST | `update` | faculty | `id`, `title`, `file` (optional replacement) | `resource` |
| POST | `delete` | faculty | `id` | |
| GET | `download` | all | `id`, `view=1` optional | file |

## Rules

- Allowed files: pdf, doc, docx, ppt, pptx, xls, xlsx, txt, png, jpg, jpeg, zip. Max 30 MB each.
- One submission per student per task. Students can replace or remove it until it is scored.
- If `allow_late` is false, submissions close at the due date. If true, late submissions are accepted and flagged with `late: true`.
- Error codes: 401 not logged in, 403 wrong role, 404 not found, 405 wrong method, 409 closed or already scored, 413 upload too large, 422 invalid input.
