import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import { useAuth } from './AuthProvider'

export default function ForgotPasswordRoute() {
  const { returnFromForgotOrReset, goToSignUp, handleOtpSent } = useAuth()
  return (
    <ForgotPasswordPage
      onBackToLogin={returnFromForgotOrReset}
      onSwitchToSignUp={goToSignUp}
      onOtpSent={handleOtpSent}
    />
  )
}
