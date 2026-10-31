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

> 1. Download [JAVA 25](https://www.oracle.com/asean/java/technologies/downloads/#jdk25-windows "Installation Link"). *Look for the x64 Installer. If other OS, search for OS appropriate for you. **You should download java if your java is not JAVA 25. To check, simply type ``java -version`` on your command prompt. It should be JAVA 25.x. If not, update your JAVA by simply installing it through the link.***
>
> 2. Download the latest version of [PHP](https://www.php.net/downloads.php?os=windows&osvariant=windows-native&version=8.5 "Installation Link"). *PHP 8.5 is a must!*.
>
> 3. In installing spring dependencies, simply look for their xml file and paste it to pom.xml. *Take note, check the pom.xml first if there's already dependency installed that you're trying to install.*
>
> 4. Viola! You can now proceed with your tasks!

## LiveKit credentials

The backend reads its LiveKit credentials from `backend/edu-meet/src/main/resources/application.properties`.
Set `livekit.api-key` and `livekit.api-secret` there, or provide `LIVEKIT_API_KEY` and
`LIVEKIT_API_SECRET` environment variables to override the development defaults. Keep real
credentials out of source control and use environment variables for deployed environments.

The frontend connects to the LiveKit server URL from `VITE_LIVEKIT_URL`. Copy
`frontend/edu-meet/.env.example` to `frontend/edu-meet/.env`, set the URL from your LiveKit project,
and restart the Vite dev server. The API key and secret belong only in the backend environment;
do not expose them as `VITE_` variables.
