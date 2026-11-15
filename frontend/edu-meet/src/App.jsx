import { useEffect, useState } from 'react'
import { logoutRequest, restoreSession } from './api/auth'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignUpPage from './pages/SignUpPage'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [authView, setAuthView] = useState('signup')
  const [resetEmail, setResetEmail] = useState('')

  useEffect(() => {
    let cancelled = false

    restoreSession()
      .then((data) => {
        if (!cancelled) setUser(data.user)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleLoginSuccess(data) {
    setUser(data.user)
  }

  function handleOtpSent(email) {
    setResetEmail(email)
    setAuthView('reset')
  }

  async function handleLogout() {
    await logoutRequest().catch(() => {})
    setUser(null)
  }

  if (checking) {
    return (
      <main className="home">
        <div className="home__panel">
          <p className="home__brand">Edu-Meet</p>
          <p className="home__email">Restoring session...</p>
        </div>
      </main>
    )
  }

  if (!user) {
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

  const name = user.first_name || user.email || 'there'

  return (
    <main className="home">
      <div className="home__panel">
        <p className="home__brand">Edu-Meet</p>
        <h1 className="home__greeting">Welcome back, {name}.</h1>
        <p className="home__email">{user.email}</p>
        <button className="home__logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default App
