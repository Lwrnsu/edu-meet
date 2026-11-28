/*
  Group 7 · File Management & Blogs, Tasks & Activities — React screens.

  Routes (added in App.jsx):
    /classes                                 My classes (from the Classes module tables)
    /classes/:classId/feed                   Class Feed tab (B1–B5)
    /classes/:classId/tasks                  Tasks tab: task list, scores, submitted files
    /classes/:classId/activities[/:taskId]   Activities tab: task details, hand in, grading
    /classes/:classId/resources              Resources tab (F1–F5)
    /classes/:classId/resources/:fileId      View File (F6)
    /announcements                           School-wide announcements

  Other groups can also reuse:
    <NotificationBell />   the bell + in-app alerts (N1–N3)
    <SideRail />           the left side bar (classes, announcements, bell, profile)
*/
export { default as ClassesPage } from './pages/ClassesPage'
export { default as ClassFeedPage } from './pages/ClassFeedPage'
export { default as TasksPage } from './pages/TasksPage'
export { default as ActivitiesPage } from './pages/ActivitiesPage'
export { default as ResourcesPage } from './pages/ResourcesPage'
export { default as ViewFilePage } from './pages/ViewFilePage'
export { default as AnnouncementsPage } from './pages/AnnouncementsPage'
export { default as NotificationBell } from './components/NotificationBell'
export { SideRail } from './pages/FbLayout'
