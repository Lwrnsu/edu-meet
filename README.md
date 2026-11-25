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
> 4. For LiveKit access, set ``LIVEKIT_API_KEY`` and ``LIVEKIT_API_SECRET`` in the terminal before starting Spring Boot. Do not put real credentials in source control.

## LiveKit credentials

The backend reads its LiveKit credentials from `backend/edu-meet/src/main/resources/application.properties`.
Set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` as environment variables before starting the backend.
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
