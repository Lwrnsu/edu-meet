import { Navigate } from 'react-router'
import { ADMIN_LOGIN_PATH, USER_LOGIN_PATH, useAuth } from './AuthProvider'

export default function RequireAuth({ portal: requiredPortal, children }) {
  const { user, portal } = useAuth()

  if (!user) {
    const to = requiredPortal === 'admin' ? ADMIN_LOGIN_PATH : USER_LOGIN_PATH
    return <Navigate to={to} replace />
  }

  if (requiredPortal && portal && portal !== requiredPortal) {
    const to = portal === 'admin' ? ADMIN_LOGIN_PATH : USER_LOGIN_PATH
    return <Navigate to={to} replace />
  }

  return children
}
