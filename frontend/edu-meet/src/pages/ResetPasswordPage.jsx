import { useState } from 'react'
import './ResetPasswordPage.css'

export default function ResetPasswordPage({ email, onCancel }) {
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const trimmedCode = code.trim()
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter a valid 6-digit code.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // email reserved for future API
    void email
    setInfo('Password reset is coming soon.')
  }

  return (
    <main className="reset">
      <div className="reset__blob" aria-hidden="true" />

      <section className="reset__card">
        <div className="reset__banner" aria-hidden="true" />

        <div className="reset__content">
          <h1 className="reset__title">Check your email</h1>
          <p className="reset__subtitle">
            Please <strong>enter your 6-digit code</strong>. Then create and confirm your new
            password
          </p>

          <form className="reset__form" onSubmit={handleSubmit} noValidate>
            <label className="reset__field">
              <span>6-digit code</span>
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </label>

            <label className="reset__field">
              <span>New Password</span>
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>

            <label className="reset__field">
              <span>Confirm New Password</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>

            <p className="reset__hint">Must be at least 8 characters</p>
            <hr className="reset__divider" />

            {error ? (
              <p className="reset__message reset__message--error" role="alert">
                {error}
              </p>
            ) : null}

            {info ? (
              <p className="reset__message reset__message--info" role="status">
                {info}
              </p>
            ) : null}

            <button className="reset__submit" type="submit">
              RESET PASSWORD
            </button>

            <button
              className="reset__submit reset__submit--secondary"
              type="button"
              onClick={() => onCancel?.()}
            >
              CANCEL
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
