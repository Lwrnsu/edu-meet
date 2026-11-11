import { useState } from 'react'
import './SignUpPage.css'

const INITIAL_FORM = {
  schoolName: '',
  location: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
}

export default function SignUpPage({ onSwitchToSignIn }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function updateField(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }
  }

  function handleTermsChange(event) {
    setForm((prev) => ({ ...prev, acceptedTerms: event.target.checked }))
  }

  function preventNav(event) {
    event.preventDefault()
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const schoolName = form.schoolName.trim()
    const location = form.location.trim()
    const email = form.email.trim()
    const { password, confirmPassword, acceptedTerms } = form

    if (!schoolName || !location || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid Gmail/email address.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!acceptedTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setInfo('Account creation is coming soon.')
  }

  return (
    <main className="signup">
      <div className="signup__blob" aria-hidden="true" />

      <section className="signup__card">
        <aside className="signup__welcome">
          <h1 className="signup__welcome-title">Welcome to Edu-Meet!</h1>
        </aside>

        <div className="signup__content">
          <h2 className="signup__title">Sign Up</h2>
          <p className="signup__subtitle">Create an account to access the lamp</p>

          <form className="signup__form" onSubmit={handleSubmit} noValidate>
            <div className="signup__grid">
              <input
                className="signup__input"
                type="text"
                name="schoolName"
                placeholder="School Name"
                value={form.schoolName}
                onChange={updateField('schoolName')}
                required
              />
              <input
                className="signup__input"
                type="text"
                name="location"
                placeholder="Location"
                value={form.location}
                onChange={updateField('location')}
                required
              />
              <input
                className="signup__input signup__input--wide"
                type="email"
                name="email"
                placeholder="Gmail"
                autoComplete="email"
                value={form.email}
                onChange={updateField('email')}
                required
              />
              <input
                className="signup__input"
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="new-password"
                value={form.password}
                onChange={updateField('password')}
                required
              />
              <input
                className="signup__input"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                required
              />
            </div>

            <label className="signup__terms">
              <input
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={handleTermsChange}
              />
              <span>
                I&apos;ve read and agree with{' '}
                <button type="button" className="signup__legal" onClick={preventNav}>
                  Terms of Service
                </button>{' '}
                and our{' '}
                <button type="button" className="signup__legal" onClick={preventNav}>
                  Privacy Policy
                </button>
              </span>
            </label>

            {error ? (
              <p className="signup__message signup__message--error" role="alert">
                {error}
              </p>
            ) : null}

            {info ? (
              <p className="signup__message signup__message--info" role="status">
                {info}
              </p>
            ) : null}

            <button className="signup__submit" type="submit">
              SIGN UP
            </button>
          </form>

          <p className="signup__footer">
            Already have an account?{' '}
            <button
              type="button"
              className="signup__link"
              onClick={() => onSwitchToSignIn?.()}
            >
              Sign In
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
