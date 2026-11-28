/*
  Group 7 · File Management & Blogs — React screens.

  Routes (added in App.jsx):
    /classes/:classId/feed                Class Feed tab (B1–B5)
    /classes/:classId/resources           Resources tab (F1–F5)
    /classes/:classId/resources/:fileId   View File (F6)
    /announcements                        School-wide announcements (dashboard)

  Other groups can also reuse:
    <NotificationBell />   the bell (N1–N3) for any header
*/
export { default as ClassFeedPage } from './pages/ClassFeedPage'
export { default as ResourcesPage } from './pages/ResourcesPage'
export { default as ViewFilePage } from './pages/ViewFilePage'
export { default as AnnouncementsPage } from './pages/AnnouncementsPage'
export { default as NotificationBell } from './components/NotificationBell'
