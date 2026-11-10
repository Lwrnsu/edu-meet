import { useState } from 'react'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignUpPage from './pages/SignUpPage'
import { clearSession, getSession } from './lib/authStorage'

function App() {
  const [session, setSessionState] = useState(() => getSession())
  const [authView, setAuthView] = useState('signup')
  const [resetEmail, setResetEmail] = useState('')

  function handleLoginSuccess(data) {
    setSessionState({ token: data.token, user: data.user })
  }

  function handleLogout() {
    clearSession()
    setSessionState(null)
    setAuthView('login')
  }

  function handleOtpSent(email) {
    setResetEmail(email)
    setAuthView('reset')
  }

  if (!session) {
    if (authView === 'login') {
      return (
        <LoginPage
          onSuccess={handleLoginSuccess}
          onSwitchToSignUp={() => setAuthView('signup')}
          onForgotPassword={() => setAuthView('forgot')}
        />
      )
    }

    if (authView === 'forgot') {
      return (
        <ForgotPasswordPage
          onBackToLogin={() => setAuthView('login')}
          onSwitchToSignUp={() => setAuthView('signup')}
          onOtpSent={handleOtpSent}
        />
      )
    }

    if (authView === 'reset') {
      return (
        <ResetPasswordPage
          email={resetEmail}
          onCancel={() => setAuthView('login')}
        />
      )
    }

    return <SignUpPage onSwitchToSignIn={() => setAuthView('login')} />
  }

  const name = session.user?.first_name || session.user?.email || 'there'

  return (
    <main className="home">
      <div className="home__panel">
        <p className="home__brand">Edu-Meet</p>
        <h1 className="home__greeting">Welcome back, {name}.</h1>
        <p className="home__email">{session.user?.email}</p>
        <button className="home__logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default App
