import { Navigate } from 'react-router'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import { FORGOT_PATH, useAuth } from './AuthProvider'

export default function ResetPasswordRoute() {
  const { resetEmail, resetOtpHint, returnFromForgotOrReset, handleResetSuccess } = useAuth()

  if (!resetEmail) {
    return <Navigate to={FORGOT_PATH} replace />
  }

  return (
    <ResetPasswordPage
      email={resetEmail}
      otpHint={resetOtpHint}
      onCancel={returnFromForgotOrReset}
      onSuccess={handleResetSuccess}
    />
  )
}
