// Where the app switcher sends you.
// `npm run dev`: each app has its own port (see vite.config.js).
// After `npm run build`: both apps are served by Apache under /flashcard-reviewer/apps/.
export const APP_URLS = import.meta.env.DEV
  ? { reviewer: 'http://localhost:5173/', notepad: 'http://localhost:5174/' }
  : { reviewer: '/flashcard-reviewer/apps/reviewer/', notepad: '/flashcard-reviewer/apps/notepad/' }
