import LoginPage from '../pages/LoginPage'
import { useAuth } from './AuthProvider'

export default function LoginRoute() {
  const { handleUserLoginSuccess, goToSignUp, openForgot } = useAuth()
  return (
    <LoginPage
      onSuccess={handleUserLoginSuccess}
      onSwitchToSignUp={goToSignUp}
      onForgotPassword={() => openForgot('login')}
    />
  )
}
