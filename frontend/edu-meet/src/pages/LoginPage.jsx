import { useState } from 'react'
import { login } from '../api/auth'
import { setSession } from '../lib/authStorage'
import './LoginPage.css'

const REMEMBER_EMAIL_KEY = 'edu_meet_remember_email'

export default function LoginPage({ onSuccess, onSwitchToSignUp, onForgotPassword }) {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_EMAIL_KEY) || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY)))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    try {
      const data = await login(trimmedEmail, password)
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
      setSession({ token: data.token, user: data.user })
      onSuccess?.(data)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login">
      <div className="login__blob" aria-hidden="true" />

      <section className="login__card">
        <aside className="login__welcome">
          <h1 className="login__welcome-title">Welcome to Edu-Meet!</h1>
        </aside>

        <div className="login__content">
          <h2 className="login__title">Welcome Back.</h2>
          <p className="login__subtitle">Sign in to your account to continue</p>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <label className="login__field">
              <span>Email</span>
              <div className="login__input-wrap">
                <span className="login__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 7 9-7" />
                  </svg>
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email@gmail.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </label>

            <label className="login__field">
              <span>Password</span>
              <div className="login__input-wrap">
                <span className="login__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 018 0v3" />
                  </svg>
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </label>

            <div className="login__options">
              <label className="login__remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="login__forgot"
                onClick={() => onForgotPassword?.()}
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            {error ? (
              <p className="login__error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="login__submit" type="submit" disabled={loading}>
              {loading ? 'LOGGING IN…' : 'LOG IN'}
            </button>
          </form>

          <p className="login__footer">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="login__link"
              onClick={() => onSwitchToSignUp?.()}
              disabled={loading}
            >
              Sign Up
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
