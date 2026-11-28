import SignUpPage from '../pages/SignUpPage'
import { useAuth } from './AuthProvider'

export default function SignUpRoute() {
  const { goToUserLogin } = useAuth()
  return <SignUpPage onSwitchToSignIn={goToUserLogin} />
}
