import AdminLoginPage from '../pages/AdminLoginPage'
import { useAuth } from './AuthProvider'

export default function AdminLoginRoute() {
  const { handleAdminLoginSuccess, openForgot, goToUserLogin } = useAuth()
  return (
    <AdminLoginPage
      onSuccess={handleAdminLoginSuccess}
      onForgotPassword={() => openForgot('admin-login')}
      onSwitchToUserLogin={goToUserLogin}
    />
  )
}
