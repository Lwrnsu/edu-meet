import { useState } from 'react'
import {
  requestForgotPasswordOtp,
  resetForgotPassword,
  verifyForgotPasswordOtp,
} from '../api/passwordSecurity'
import './ResetPasswordPage.css'

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[@#!%_]/.test(password)
  )
}

export default function ResetPasswordPage({
  email,
  otpHint = '',
  onCancel,
  onSuccess,
}) {
  const [step, setStep] = useState('otp')
  const [code, setCode] = useState('')
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState(otpHint || '')
  const [loading, setLoading] = useState(false)

  function clearMessages() {
    setError('')
    setInfo('')
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()
    clearMessages()

    const trimmedCode = code.trim()
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter a valid 6-digit code.')
      return
    }

    setLoading(true)
    try {
      await verifyForgotPasswordOtp({ email, otp: trimmedCode })
      setVerifiedOtp(trimmedCode)
      setNewPassword('')
      setConfirmPassword('')
      setStep('password')
      setInfo('OTP verified. Create your new password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    clearMessages()
    setCode('')
    setLoading(true)
    try {
      const data = await requestForgotPasswordOtp({ email })
      setInfo(data.message || 'OTP sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    clearMessages()

    if (!newPassword || !confirmPassword) {
      setError('All password fields are required.')
      return
    }
    if (!isStrongPassword(newPassword)) {
      setError(
        'New password must be at least 8 characters and include an uppercase letter, a number, and a special character (@, #, !, %, or _).'
      )
      return
    }
    if (confirmPassword !== newPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    if (!/^\d{6}$/.test(verifiedOtp)) {
      setError('OTP verification is required before changing password.')
      setStep('otp')
      return
    }

    setLoading(true)
    try {
      const data = await resetForgotPassword({
        email,
        otp: verifiedOtp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setInfo(data.message || 'Password updated successfully.')
      window.setTimeout(() => {
        onSuccess?.(data)
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="reset">
      <div className="reset__blob" aria-hidden="true" />

      <section className="reset__card">
        <div className="reset__banner" aria-hidden="true" />

        <div className="reset__content">
          {step === 'otp' ? (
            <>
              <h1 className="reset__title">Check your email</h1>
              <p className="reset__subtitle">
                Please <strong>enter your 6-digit code</strong> to verify and proceed to creating
                your new password
              </p>

              <form className="reset__form" onSubmit={handleOtpSubmit} noValidate>
                <label className="reset__field">
                  <span>6-digit code</span>
                  <input
                    type="text"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      clearMessages()
                    }}
                    disabled={loading}
                    required
                  />
                </label>

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

                <button className="reset__submit" type="submit" disabled={loading}>
                  {loading ? 'Verifying…' : 'VERIFY AND PROCEED'}
                </button>

                <p className="reset__hint">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    className="reset__resend"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </p>

                <button
                  className="reset__submit reset__submit--secondary"
                  type="button"
                  onClick={() => onCancel?.()}
                  disabled={loading}
                >
                  CANCEL
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="reset__title">Create new password</h1>
              <p className="reset__subtitle">
                The password must be at least 8 characters long and include at least one uppercase
                letter, one number (0-9), and one special character such as @, #, !, %, or _.
              </p>

              <form className="reset__form" onSubmit={handlePasswordSubmit} noValidate>
                <label className="reset__field">
                  <span>New Password</span>
                  <input
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      clearMessages()
                    }}
                    disabled={loading}
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
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      clearMessages()
                    }}
                    disabled={loading}
                    required
                  />
                </label>

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

                <button className="reset__submit" type="submit" disabled={loading}>
                  {loading ? 'Saving…' : 'RESET PASSWORD'}
                </button>

                <button
                  className="reset__submit reset__submit--secondary"
                  type="button"
                  onClick={() => onCancel?.()}
                  disabled={loading}
                >
                  CANCEL
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
