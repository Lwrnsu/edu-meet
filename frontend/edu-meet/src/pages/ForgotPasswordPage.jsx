import { useState } from 'react'
import './ForgotPasswordPage.css'

export default function ForgotPasswordPage({ onBackToLogin, onSwitchToSignUp, onOtpSent }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    onOtpSent?.(trimmedEmail)
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
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <div className="forgot__back-row">
              <button
                type="button"
                className="forgot__back"
                onClick={() => onBackToLogin?.()}
              >
                Go back to Login
              </button>
            </div>

            {error ? (
              <p className="forgot__message forgot__message--error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="forgot__submit" type="submit">
              SEND OTP
            </button>
          </form>

          <p className="forgot__footer">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="forgot__link"
              onClick={() => onSwitchToSignUp?.()}
            >
              Sign Up
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
