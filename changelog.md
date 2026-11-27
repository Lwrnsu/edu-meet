# Full Change Log

This documents the current uncommitted worktree, including changes accumulated over earlier turns—not only the latest implementation. No commit was made.

## Authentication and classroom authorization

- [JwtAuthFilter.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/security/JwtAuthFilter.java) now turns verified login sessions and application JWTs into a trusted authenticated user with normalized roles.
- [AuthenticatedUser.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/security/AuthenticatedUser.java) was added to represent that trusted identity.
- [SecurityConfig.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/security/SecurityConfig.java) configures stateless authentication, returns `401` for unauthenticated requests, and prevents duplicate servlet registration of the JWT filter.
- [ClassroomController.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/controller/ClassroomController.java) now restricts classroom management to administrative roles and limits faculty enrollment actions to classrooms assigned to them.
- [Meeting.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/Meeting.java) gained helpers for checking multiple account identifiers.
- Wildcard CORS annotations were removed from the room, classroom, and student controllers so CORS is managed centrally.

## Class-based meeting access and admission

- [RoomController.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/controller/RoomController.java) now uses authenticated identity and `classId`/`blockId`, rather than trusting a caller-supplied room name or participant identity. It derives the room name and role from authorization data.
- It exposes endpoints to list authorized sections, request admission, check a request's status, list requests for faculty, and approve or deny requests.
- [PhpClassRepository.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/repository/PhpClassRepository.java) queries the PHP/MySQL class, enrollment, block, program, and Dean data.
- [PhpClassDatabaseConfiguration.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/config/PhpClassDatabaseConfiguration.java) configures the separate database connection.
- [CanonicalClassAccessService.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/service/CanonicalClassAccessService.java) applies roster rules: students need enrollment in that section, faculty need assignment to that class, and Deans are limited by department.
- New types in [the room package](backend/edu-meet/src/main/java/com/block_a/edu_meet/room) represent authorized rooms, targets, roles, request status, and schedule data.
- [LiveKitPresenceService.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/service/LiveKitPresenceService.java) checks current LiveKit room and participant presence.
- [MeetingAdmissionService.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/service/MeetingAdmissionService.java) stores admission requests in Redis with a two-hour expiry, lets requesters poll status, and permits the assigned faculty to decide.
- Room-admin permission is limited to faculty and Deans; an approved guest does not receive it.

## Frontend meeting flow

- [App.jsx](frontend/edu-meet/src/App.jsx) adds the login route and gates meeting routes behind authentication.
- [VideoRoom.jsx](frontend/edu-meet/src/Video%20Conference/VideoRoom.jsx) loads authorized sections, sends bearer tokens to the backend, requests meeting tokens by class and block, and connects to LiveKit only after receiving a token.
- The meeting UI also lets an unlisted user request admission and poll for a decision.
- Faculty see a polling request queue with admit/deny controls.
- Backend-provided LiveKit URLs are used when available.

## Schedule handling

- [MeetingSchedulePolicy.java](backend/edu-meet/src/main/java/com/block_a/edu_meet/service/MeetingSchedulePolicy.java) implements the intended ten-minutes-early-to-class-end rule.
- The policy is **tested but not connected to production token issuance**, because the real schedule table/API has not been identified.

## Setup, configuration, and documentation

- [Database.php](php/config/Database.php) now reads PHP database connection settings from environment variables.
- [docker-compose.yaml](docker-compose.yaml) adds service health checks, startup dependencies, environment-based connections, and MongoDB configuration.
- [001-create-php-database.sql](docker/mysql/init/001-create-php-database.sql) creates the empty `EduMeet` database on a fresh MySQL volume; **it does not create class tables or insert class data**.
- [.env.template](.env.template) documents the added MySQL and LiveKit settings.
- [README.md](README.md) documents Compose startup, the meeting endpoints, required database data, admission behavior, and the schedule-gating limitation.
- [pom.xml](backend/edu-meet/pom.xml) removes the JPA and MySQL connector dependency entries and adds the Spring MVC test starter.

## Tests and generated files

- Added focused tests for authentication, classroom and room controllers, canonical access, LiveKit presence, admission decisions, and schedule boundaries.
- [DummyClassFixture.java](backend/edu-meet/src/test/java/com/block_a/edu_meet/fixtures/DummyClassFixture.java) contains explicitly labeled synthetic data for tests only.
- Removed the older generic [EduMeetApplicationTests.java](backend/edu-meet/src/test/java/com/block_a/edu_meet/EduMeetApplicationTests.java); targeted tests now cover the relevant flows.
- Build output also modified files under `backend/edu-meet/target/`; those are generated artifacts, not application behavior.

## Validation

- All 36 backend tests passed.
- Frontend lint and build passed.
- Lint reported warnings in unrelated files.
- The frontend build reported the existing large-chunk warning.
- Compose configuration and PHP syntax checks passed.
- The services were not run together against a real class database or LiveKit instance, so those integrations remain unverified.
