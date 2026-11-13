import { useEffect, useState } from 'react'
import { logoutRequest, refreshSession } from './api/auth'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignUpPage from './pages/SignUpPage'
import {
  clearSession,
  getRefreshToken,
  getSession,
  isTokenExpired,
  setSession,
} from './lib/authStorage'

function App() {
  const [session, setSessionState] = useState(() => {
    const saved = getSession()
    if (!saved || isTokenExpired(saved.token)) return null
    return saved
  })
  const [checking, setChecking] = useState(() => {
    const saved = getSession()
    return Boolean(getRefreshToken() && (!saved || isTokenExpired(saved.token)))
  })
  const [authView, setAuthView] = useState('signup')
  const [resetEmail, setResetEmail] = useState('')

  useEffect(() => {
    if (!checking) return
    let cancelled = false

    async function restore() {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        if (!cancelled) setChecking(false)
        return
      }
      try {
        const data = await refreshSession(refreshToken)
        if (cancelled) return
        const nextSession = {
          token: data.token,
          refresh_token: data.refresh_token || refreshToken,
          user: data.user,
        }
        setSession(nextSession)
        setSessionState(nextSession)
      } catch {
        if (cancelled) return
        clearSession()
        setSessionState(null)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [checking])

  function handleLoginSuccess(data) {
    const nextSession = {
      token: data.token,
      refresh_token: data.refresh_token || null,
      user: data.user,
    }
    setSession(nextSession)
    setSessionState(nextSession)
  }

  function handleOtpSent(email) {
    setResetEmail(email)
    setAuthView('reset')
  }

  async function handleLogout() {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      await logoutRequest(refreshToken).catch(() => {})
    }
    clearSession()
    setSessionState(null)
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
