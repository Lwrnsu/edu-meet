import { useState } from 'react'
import { systemAdminLogin } from '../api/auth'
import vector2 from '../assets/auth/vector-2.png'
import vector5 from '../assets/auth/vector-5.png'
import vector6 from '../assets/auth/vector-6.png'
import './LoginPage.css'

const REMEMBER_EMAIL_KEY = 'edu_meet_admin_remember_email'

export default function AdminLoginPage({ onSuccess, onForgotPassword, onSwitchToUserLogin }) {
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
      const data = await systemAdminLogin(trimmedEmail, password)
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
      onSuccess?.(data)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login login--admin">
      <div className="login__art" aria-hidden="true">
        <div className="login__art-bottom">
          <img className="login__art-vector5" src={vector5} alt="" />
          <img className="login__art-vector2" src={vector2} alt="" />
        </div>
        <div className="login__art-side">
          <img className="login__art-vector6" src={vector6} alt="" />
        </div>
      </div>

      <section className="login__card">
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
            Not a system admin?{' '}
            <button
              type="button"
              className="login__link"
              onClick={() => onSwitchToUserLogin?.()}
              disabled={loading}
            >
              User login
            </button>
          </p>
        </div>

        <aside className="login__welcome">
          <h1 className="login__welcome-title">Welcome To Edu-Meet, Admin!</h1>
        </aside>
      </section>
    </main>
  )
}
