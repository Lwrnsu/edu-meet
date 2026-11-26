# EduMeet Files / Tasks: PHP back end (JSON API)

No HTML here. The front end calls `php/index.php?r=<controller>.<action>`.
All responses: `{ "ok": true|false, "message": ..., "data": ... }` (errors use `"error"`).
Every POST needs the CSRF token from `auth.me` (`data.csrf`), sent as header `X-CSRF-Token`.

| Route | Method | Who | Params |
|---|---|---|---|
| auth.me | GET | any | - |
| auth.switchRole | POST | any (DEV_MODE) | role |
| tasks.list | GET | any | - |
| tasks.show | GET | any | id |
| tasks.save | POST (multipart) | faculty | id?, title, description, due_date, max_score, allow_late, remove_att[], attachments[] |
| tasks.delete | POST | faculty | id |
| submissions.submit | POST (multipart) | student | task_id, file |
| submissions.remove | POST | student | task_id |
| submissions.score | POST | faculty | task_id, submission_id, score, feedback |
| resources.list | GET | any | - |
| resources.upload | POST (multipart) | faculty | files[] |
| resources.update | POST (multipart) | faculty | id, title, file? |
| resources.delete | POST | faculty | id |
| files.download | GET | any | type=file\|task\|submission, id, view=1 (inline) |
| exports.scores | GET | faculty | id (task id) -> CSV |
| exports.submissionsZip | GET | faculty | id (task id) -> ZIP |

Structure: `config.php` (constants) · `core/` (Db, Http, Auth, Uploader, Util, base Controller) ·
`controllers/` · `sql/` · `uploads/` · `index.php` (router).
Database connection comes from `../config/Database.php` via `core/Db.php`.
