import { useState } from 'react'
import { requestForgotPasswordOtp } from '../api/passwordSecurity'
import './ForgotPasswordPage.css'

export default function ForgotPasswordPage({ onBackToLogin, onSwitchToSignUp, onOtpSent }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const data = await requestForgotPasswordOtp({ email: trimmedEmail })
      const message = data.message || 'OTP sent.'
      setInfo(message)
      onOtpSent?.(trimmedEmail, { message })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="forgot">
      <div className="forgot__blob" aria-hidden="true" />

      <section className="forgot__card">
        <div className="forgot__banner" aria-hidden="true" />

        <div className="forgot__content">
          <h1 className="forgot__title">Forgot Password</h1>
          <p className="forgot__subtitle">
            Enter your registered email, and we will send you an OTP
          </p>

          <form className="forgot__form" onSubmit={handleSubmit} noValidate>
            <label className="forgot__field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="Registered Email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                  setInfo('')
                }}
                disabled={loading}
                required
              />
            </label>

            <div className="forgot__back-row">
              <button
                type="button"
                className="forgot__back"
                onClick={() => onBackToLogin?.()}
                disabled={loading}
              >
                Go back to Login
              </button>
            </div>

            {error ? (
              <p className="forgot__message forgot__message--error" role="alert">
                {error}
              </p>
            ) : null}

            {info ? (
              <p className="forgot__message forgot__message--info" role="status">
                {info}
              </p>
            ) : null}

            <button className="forgot__submit" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'SEND OTP'}
            </button>
          </form>

          <p className="forgot__footer">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="forgot__link"
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
