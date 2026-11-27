import { Navigate, Route, Routes } from 'react-router'
import AdminLoginRoute from './auth/AdminLoginRoute'
import AdminPortalRoute from './auth/AdminPortalRoute'
import ForgotPasswordRoute from './auth/ForgotPasswordRoute'
import LoginRoute from './auth/LoginRoute'
import RequireAuth from './auth/RequireAuth'
import ResetPasswordRoute from './auth/ResetPasswordRoute'
import SchoolPortalRoute from './auth/SchoolPortalRoute'
import SignUpRoute from './auth/SignUpRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignUpRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/login/system_admin" element={<AdminLoginRoute />} />
      <Route path="/forgot" element={<ForgotPasswordRoute />} />
      <Route path="/reset" element={<ResetPasswordRoute />} />
      <Route
        path="/system_admin/*"
        element={
          <RequireAuth portal="admin">
            <AdminPortalRoute />
          </RequireAuth>
        }
      />
      <Route
        path="/portal/*"
        element={
          <RequireAuth portal="user">
            <SchoolPortalRoute />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
