import { Navigate, Route, Routes } from 'react-router'
import ChatbotLauncher from './components/ChatbotLauncher.jsx'
import AdminLoginRoute from './auth/AdminLoginRoute.jsx'
import AdminPortalRoute from './auth/AdminPortalRoute.jsx'
import ForgotPasswordRoute from './auth/ForgotPasswordRoute.jsx'
import LoginRoute from './auth/LoginRoute.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import ResetPasswordRoute from './auth/ResetPasswordRoute.jsx'
import SchoolPortalRoute from './auth/SchoolPortalRoute.jsx'
import SignUpRoute from './auth/SignUpRoute.jsx'
import { AnnouncementsPage, ClassFeedPage, ResourcesPage, ViewFilePage } from './features/files-and-posts'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignUpRoute />} />
        <Route path="/forgot" element={<ForgotPasswordRoute />} />
        <Route path="/reset" element={<ResetPasswordRoute />} />
        <Route path="/login/system_admin" element={<AdminLoginRoute />} />
        <Route path="/admin" element={<Navigate to="/login/system_admin" replace />} />
        <Route
          path="/portal"
          element={
            <RequireAuth portal="user">
              <SchoolPortalRoute />
            </RequireAuth>
          }
        />
        <Route
          path="/system_admin"
          element={
            <RequireAuth portal="admin">
              <AdminPortalRoute />
            </RequireAuth>
          }
        />
        {/* Group 7 · File Management & Blogs */}
        <Route path="/classes/:classId/feed" element={<ClassFeedPage />} />
        <Route path="/classes/:classId/resources" element={<ResourcesPage />} />
        <Route path="/classes/:classId/resources/:fileId" element={<ViewFilePage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Routes>
      <ChatbotLauncher />
    </>
  )
}

export default App
