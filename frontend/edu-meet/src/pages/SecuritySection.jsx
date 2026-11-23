import { useState } from 'react'
import {
  changePassword,
  requestPasswordOtp,
  verifyPasswordOtp,
} from '../api/passwordSecurity'

const EMPTY_PASSWORDS = {
  current: '',
  next: '',
  confirm: '',
}

const EMPTY_VISIBILITY = {
  current: false,
  next: false,
  confirm: false,
}

function displayName(user) {
  const first = user?.first_name?.trim() || ''
  const last = user?.last_name?.trim() || ''
  const full = `${first} ${last}`.trim()
  return full || user?.email || 'Administrator'
}

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[@#!%_]/.test(password)
  )
}

function IconEye({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4l16 16" />
    </svg>
  )
}

export default function SecuritySection({ user }) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState(() => user?.email || '')
  const [otp, setOtp] = useState('')
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS)
  const [visibility, setVisibility] = useState(EMPTY_VISIBILITY)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function clearMessages() {
    setError('')
    setInfo('')
  }

  function resetPasswordFields() {
    setPasswords(EMPTY_PASSWORDS)
    setVisibility(EMPTY_VISIBILITY)
  }

  async function sendOtp(trimmedEmail) {
    const data = await requestPasswordOtp({ email: trimmedEmail })
    const otpHint = data.otp ? ` Dev OTP: ${data.otp}` : ''
    setInfo((data.message || 'OTP sent.') + otpHint)
  }

  async function handleEmailSubmit(event) {
    event.preventDefault()
    clearMessages()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      await sendOtp(trimmedEmail)
      setOtp('')
      setVerifiedOtp('')
      resetPasswordFields()
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()
    clearMessages()

    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code.')
      return
    }

    setSubmitting(true)
    try {
      await verifyPasswordOtp({ email: email.trim(), otp: code })
      setVerifiedOtp(code)
      resetPasswordFields()
      setStep('password')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendOtp() {
    clearMessages()
    setOtp('')
    setSubmitting(true)
    try {
      await sendOtp(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  function updatePassword(field) {
    return (event) => {
      setPasswords((prev) => ({ ...prev, [field]: event.target.value }))
      clearMessages()
    }
  }

  function toggleVisibility(field) {
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    clearMessages()

    const current = passwords.current
    const next = passwords.next
    const confirm = passwords.confirm

    if (!current || !next || !confirm) {
      setError('All password fields are required.')
      return
    }
    if (!isStrongPassword(next)) {
      setError(
        'New password must be at least 8 characters and include an uppercase letter, a number, and a special character (@, #, !, %, or _).'
      )
      return
    }
    if (next === current) {
      setError('New password must be different from the current password.')
      return
    }
    if (confirm !== next) {
      setError('New password and confirmation do not match.')
      return
    }
    if (!/^\d{6}$/.test(verifiedOtp)) {
      setError('OTP verification is required before changing password.')
      setStep('otp')
      return
    }

    setSubmitting(true)
    try {
      const data = await changePassword({
        email: email.trim(),
        otp: verifiedOtp,
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      })
      setInfo(data.message || 'Password updated successfully.')
      resetPasswordFields()
      setOtp('')
      setVerifiedOtp('')
      setStep('email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancelPassword() {
    clearMessages()
    setOtp('')
    setVerifiedOtp('')
    resetPasswordFields()
    setStep('email')
  }

  return (
    <section className="admin-security" aria-label="Security">
      <div className="admin-security__panel">
        <p className="admin-security__identity">
          {displayName(user)} • Edu-Meet
        </p>
        <h2 className="admin-security__title">Change Password</h2>

        {step === 'email' ? (
          <>
            <p className="admin-security__subtitle">
              Enter your registered email, and we will send you an OTP to change your password.
            </p>

            <form className="admin-security__form" onSubmit={handleEmailSubmit} noValidate>
              <label className="admin-security__field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearMessages()
                  }}
                  aria-label="Email"
                />
              </label>

              {error ? (
                <p className="admin-security__message admin-security__message--error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="admin-security__submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Continue'}
              </button>
            </form>
          </>
        ) : null}

        {step === 'otp' ? (
          <>
            <p className="admin-security__subtitle">
              Enter the 6 digit code that was sent to your email to verify and proceed to changing
              your password.
            </p>

            <form className="admin-security__form" onSubmit={handleOtpSubmit} noValidate>
              <label className="admin-security__field">
                <span>OTP</span>
                <input
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                    clearMessages()
                  }}
                  aria-label="OTP"
                />
              </label>

              {error ? (
                <p className="admin-security__message admin-security__message--error" role="alert">
                  {error}
                </p>
              ) : null}

              {info ? (
                <p className="admin-security__message admin-security__message--info" role="status">
                  {info}
                </p>
              ) : null}

              <button type="submit" className="admin-security__submit" disabled={submitting}>
                {submitting ? 'Verifying…' : 'Verify and Proceed'}
              </button>

              <p className="admin-security__resend">
                Didn’t receive the code?{' '}
                <button
                  type="button"
                  className="admin-security__resend-link"
                  onClick={handleResendOtp}
                  disabled={submitting}
                >
                  Resend OTP
                </button>
              </p>
            </form>
          </>
        ) : null}

        {step === 'password' ? (
          <>
            <p className="admin-security__subtitle">
              The password must be at least 8 characters long and include at least one uppercase
              letter, one number (0-9), and one special character such as @, #, !, %, or _.
            </p>

            <form className="admin-security__form" onSubmit={handlePasswordSubmit} noValidate>
              <label className="admin-security__field">
                <span>Current Password</span>
                <div className="admin-security__password-wrap">
                  <input
                    type={visibility.current ? 'text' : 'password'}
                    name="currentPassword"
                    autoComplete="current-password"
                    value={passwords.current}
                    onChange={updatePassword('current')}
                    aria-label="Current Password"
                  />
                  <button
                    type="button"
                    className="admin-security__eye"
                    aria-label={visibility.current ? 'Hide current password' : 'Show current password'}
                    onClick={() => toggleVisibility('current')}
                  >
                    <IconEye open={visibility.current} />
                  </button>
                </div>
              </label>

              <label className="admin-security__field">
                <span>Enter your new password</span>
                <div className="admin-security__password-wrap">
                  <input
                    type={visibility.next ? 'text' : 'password'}
                    name="newPassword"
                    autoComplete="new-password"
                    value={passwords.next}
                    onChange={updatePassword('next')}
                    aria-label="Enter your new password"
                  />
                  <button
                    type="button"
                    className="admin-security__eye"
                    aria-label={visibility.next ? 'Hide new password' : 'Show new password'}
                    onClick={() => toggleVisibility('next')}
                  >
                    <IconEye open={visibility.next} />
                  </button>
                </div>
              </label>

              <label className="admin-security__field">
                <span>Confirm your new password</span>
                <div className="admin-security__password-wrap">
                  <input
                    type={visibility.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={passwords.confirm}
                    onChange={updatePassword('confirm')}
                    aria-label="Confirm your new password"
                  />
                  <button
                    type="button"
                    className="admin-security__eye"
                    aria-label={visibility.confirm ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => toggleVisibility('confirm')}
                  >
                    <IconEye open={visibility.confirm} />
                  </button>
                </div>
              </label>

              {error ? (
                <p className="admin-security__message admin-security__message--error" role="alert">
                  {error}
                </p>
              ) : null}

              {info ? (
                <p className="admin-security__message admin-security__message--info" role="status">
                  {info}
                </p>
              ) : null}

              <button type="submit" className="admin-security__submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Change Password'}
              </button>
              <button
                type="button"
                className="admin-security__submit admin-security__submit--secondary"
                onClick={handleCancelPassword}
                disabled={submitting}
              >
                Cancel
              </button>
            </form>
          </>
        ) : null}
      </div>
    </section>
  )
}
