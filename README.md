# Installation Guide

&emsp;This is the guide for installation before proceeding to the actual development. For prerequisites, install <strong>[git](https://www.youtube.com/watch?v=ibz-tSrnURQ "Installation Guide") & [npm](https://www.youtube.com/watch?v=oqvekEgYKXA "Installation Guide")</strong> in your device. <em>Ask your project manager if there's question on installation.</em>

## Copying the repository:

> 1. Open command prompt and write ``git clone https://github.com/Lwrnsu/edu-meet``. *Note: it must be place in a folder you know to prevent misplacing it.*
>
> 2. Create your own branch, ``git checkout -b <last name>``. For ex. ``git checkout -b DE_LUNA``.
>
> 3. After creating your own branch, check your branch if it's pointed to the branch that you've created using ``git branch --show-current``. *It should show your last name, not main.*
>
> 4. Push your branch using ``git push origin <branch-name>``. For ex. ``git push origin DE_LUNA``. *Take note, you must be a collaborator to the repository. If not, ask your project manager.*
>    
> 5. Viola! You can now proceed with your tasks!

## Front End Installation Guide

> 1. Change your directory to the front end folder. For ex. ``cd C:/Users/User/Desktop/edu-meet/frontend``. *The last folder must be frontend folder*.
>
> 2. Type the code, ``npm install``.
>
> 3. Viola! You can now proceed with your tasks!

## Back End Installation Guide

> 1. Install [Java 25](https://www.oracle.com/asean/java/technologies/downloads/#jdk25-windows) and check it with ``java -version``.
>
> 2. Open a terminal in ``backend/edu-meet``. The included Maven Wrapper downloads and runs the project's Maven version, so Maven does not need to be installed separately.
>
> 3. Run ``.\mvnw.cmd test`` to compile the backend and run its tests. Run ``.\mvnw.cmd spring-boot:run`` to start it locally.
>
> 4. Viola! You can now proceed with your tasks!

## Running the backend with Docker Compose

From the repository root, run ``docker compose up --build``. Compose starts MySQL,
Redis, and MongoDB and waits for them to become healthy before starting Spring Boot.
MySQL creates ``edu_meet_db`` and the PHP class database ``EduMeet`` on a fresh data volume. For local
development the MySQL root password defaults to ``secret``; set
``MYSQL_ROOT_PASSWORD`` in the root ``.env`` file to use a different password.

## Classroom meeting access

Spring reads meeting membership from the PHP/MySQL ``EduMeet`` database:
``classes.faculty_id`` for assigned faculty, ``enrollments.student_id`` and
``enrollments.block_id`` for enrolled students, and ``deans.department_id`` for
department-scoped Dean access. The PHP class schema and school records must already
be present in ``EduMeet``; Compose creates the database but does not insert class,
block, enrollment, or schedule records. No dummy class data is seeded at runtime.

The authenticated meeting page loads authorized sections from
``GET /api/room/classes``. ``POST /api/room/token`` accepts ``classId`` and
``blockId``; the backend derives the LiveKit room name and identity instead of
trusting a caller-provided room name. Validated students, faculty, and Deans can
create an empty room on first entry. Unlisted users can request admission through
``POST /api/room/admission-requests``. Their request remains pending until the
assigned faculty approves it; faculty requests are shown in the meeting panel and
queued if the faculty is not currently in the room. Pending requests expire after
two hours. LiveKit presence checks require ``LIVEKIT_URL``, ``LIVEKIT_API_KEY``,
and ``LIVEKIT_API_SECRET``.

The ten-minute early-join rule currently exists only as a policy test using
synthetic schedule data. The repository does not yet define a real schedule table
or API, so production meeting tokens are not schedule-gated. The clearly labeled
``DUMMY`` class, block, subject, and schedule fixture is under
``backend/edu-meet/src/test`` and is never persisted.

## Change log

| Area | Change made | Purpose and notes |
|---|---|---|
| Authentication | Added authenticated-user handling for verified login sessions and application JWTs; meeting routes now require authentication. | Carries the trusted user ID and role into backend authorization instead of accepting identity from the request body. |
| CORS configuration | Removed wildcard CORS annotations from the room, classroom, and student controllers. | Uses the centralized security CORS configuration instead. |
| Classroom administration | Restricted classroom creation, listing, and faculty assignment to administrative roles; limited faculty enrollment actions to their assigned classrooms. | Prevents unauthenticated or unrelated users from managing classroom records. |
| Canonical meeting access | Added class-section lookup and roster checks for assigned faculty, enrolled students, and department-scoped Deans. | `GET /api/room/classes` lists authorized sections. `POST /api/room/token` accepts class and block IDs and derives the room name and identity on the backend. |
| LiveKit tokens | Added role-aware token grants and server-side LiveKit room/participant presence checks. | Students and approved guests do not receive room-admin permission. LiveKit requires its URL, API key, and secret. |
| Admission requests | Added Redis-backed requests, requester status polling, and faculty approve/deny controls in the meeting UI. | Requests expire after two hours and remain queued if faculty are not present. |
| Meeting schedule policy | Added a policy and boundary tests for joining ten minutes before a scheduled class through its end. | **Not connected to production token issuance** because the real schedule source is not defined. Test data is synthetic and marked `DUMMY`. |
| Frontend meeting flow | Added login-gated meeting routes, class/section selection, bearer-authenticated API calls, admission status, and a faculty request panel. | Connects to LiveKit only after the backend returns an authorized token. |
| PHP class database | Added a separate, environment-configured Spring connection and made PHP database settings configurable through environment variables. | Queries use the existing PHP class model. Actual table schema and account IDs still need confirmation against the live database. |
| Docker Compose | Added MySQL, Redis, and MongoDB health checks, service dependencies, and environment-based connection settings. Added initialization that creates the empty `EduMeet` database. | No class tables or sample production records are created; configure a dedicated read-only database account for deployment. |
| Backend dependencies and tests | Removed the JPA and MySQL connector dependency entries, added the Spring MVC test dependency, and added focused authentication, controller, roster, presence, admission, and schedule tests. | The older generic application smoke test was removed. The current backend suite has 36 passing tests. |
| Documentation and environment template | Documented startup, meeting access, required LiveKit settings, dummy-data boundaries, and the schedule limitation. | Updated this README and `.env.template`; real secrets should remain outside source control. |

## Running the demo and the Redis session test

> **Mac / Linux:** `bash demo.sh`, then in another terminal `EMAIL=you@mail.com PASSWORD=secret bash test-redis.sh`
>
> **Windows:** start MySQL in XAMPP, then run `demo.cmd`. In a second window run `set EMAIL=you@mail.com`, `set PASSWORD=secret`, then `test-redis.cmd`. Redis on Windows needs Memurai, Docker Desktop, or WSL. `demo.cmd` starts whichever it finds.
>
> The test prints `ALL GOOD` when everything passes. Add `LOGIN_PATH=php-system-admin-login` (Mac) or `set LOGIN_PATH=php-system-admin-login` (Windows) for an admin account.
> 4. For LiveKit access, set ``LIVEKIT_API_KEY`` and ``LIVEKIT_API_SECRET`` in the terminal before starting Spring Boot. Do not put real credentials in source control.

## LiveKit credentials

The backend reads its LiveKit credentials from `backend/edu-meet/src/main/resources/application.properties`.
Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` as environment variables before starting the backend.
For Docker Compose, also set `ATTENDANCE_REPORT_KEY` to a private value before starting the services.
Keep real credentials and report keys out of source control.

The frontend connects to the LiveKit server URL from `VITE_LIVEKIT_URL`. Copy
`frontend/edu-meet/.env.example` to `frontend/edu-meet/.env`, set the URL from your LiveKit project,
and restart the Vite dev server. The API key and secret belong only in the backend environment;
do not expose them as `VITE_` variables.

## Meeting attendance tracking

The backend records attendance from signed LiveKit webhooks; browser callbacks are not used as
the source of attendance. In the LiveKit project settings, add the publicly reachable URL
`https://<your-backend-host>/api/attendance/webhook` and enable the `participant_joined`,
`participant_left`, and `room_finished` events. Use the same API key and secret in
`LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` that the LiveKit project uses to sign its webhooks.

To read a room's attendance, set `ATTENDANCE_REPORT_KEY` on the backend, then send it in the
`X-Attendance-Report-Key` header to `GET /api/attendance/{roomName}`. Each result includes the
participant identity, first join time, total minutes inside, and total minutes away. Away time
includes gaps between joins and time after the last departure until the room finishes (or the
current time while it is still active).

Attendance is currently kept in memory and will be cleared when the backend restarts. Add a
database before relying on it for durable attendance records.
