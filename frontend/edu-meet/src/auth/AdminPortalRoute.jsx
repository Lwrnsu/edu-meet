import AdminDashboard from '../pages/AdminDashboard'
import { useAuth } from './AuthProvider'

export default function AdminPortalRoute() {
  const { user, handleLogout } = useAuth()
  return <AdminDashboard user={user} onLogout={handleLogout} />
}
