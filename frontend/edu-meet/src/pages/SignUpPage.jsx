import { useState } from 'react'
import { signup } from '../api/auth'
import { isLettersOnlyName } from '../api/nameValidation'
import './SignUpPage.css'

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  email: '',
  schoolName: '',
  location: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
}

export default function SignUpPage({ onSwitchToSignIn }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const middleName = form.middleName.trim()
    const suffix = form.suffix.trim()
    const schoolName = form.schoolName.trim()
    const location = form.location.trim()
    const email = form.email.trim()
    const { password, confirmPassword, acceptedTerms } = form

    if (!firstName || !lastName || !schoolName || !location || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }

    if (!isLettersOnlyName(firstName)) {
      setError('First name must contain letters only.')
      return
    }

    if (!isLettersOnlyName(lastName)) {
      setError('Last name must contain letters only.')
      return
    }

    if (middleName && !isLettersOnlyName(middleName)) {
      setError('Middle name must contain letters only.')
      return
    }

    if (suffix && !isLettersOnlyName(suffix)) {
      setError('Suffix must contain letters only.')
      return
    }

    if (!isLettersOnlyName(schoolName)) {
      setError('School name must contain letters only.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid Gmail/email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
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

    setSubmitting(true)
    try {
      const data = await signup({
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
        suffix: suffix || null,
        email,
        password,
        confirm_password: confirmPassword,
        school_name: schoolName,
        location,
        accepted_terms: true,
      })

      setInfo(data.message || 'Signup submitted. Your account is pending system admin approval.')
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
    } finally {
      setSubmitting(false)
    }
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
                name="firstName"
                placeholder="First Name"
                autoComplete="given-name"
                value={form.firstName}
                onChange={updateField('firstName')}
                required
                disabled={submitting}
              />
              <input
                className="signup__input"
                type="text"
                name="lastName"
                placeholder="Last Name"
                autoComplete="family-name"
                value={form.lastName}
                onChange={updateField('lastName')}
                required
                disabled={submitting}
              />
              <input
                className="signup__input"
                type="text"
                name="middleName"
                placeholder="Middle Name"
                autoComplete="additional-name"
                value={form.middleName}
                onChange={updateField('middleName')}
                disabled={submitting}
              />
              <input
                className="signup__input"
                type="text"
                name="suffix"
                placeholder="Suffix"
                autoComplete="honorific-suffix"
                value={form.suffix}
                onChange={updateField('suffix')}
                disabled={submitting}
              />
              <input
                className="signup__input"
                type="email"
                name="email"
                placeholder="Gmail"
                autoComplete="email"
                value={form.email}
                onChange={updateField('email')}
                required
                disabled={submitting}
              />
              <input
                className="signup__input"
                type="text"
                name="schoolName"
                placeholder="School Name"
                value={form.schoolName}
                onChange={updateField('schoolName')}
                required
                disabled={submitting}
              />
              <input
                className="signup__input signup__input--wide"
                type="text"
                name="location"
                placeholder="Location"
                value={form.location}
                onChange={updateField('location')}
                required
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
              />
            </div>

            <label className="signup__terms">
              <input
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={handleTermsChange}
                disabled={submitting}
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

            <button className="signup__submit" type="submit" disabled={submitting}>
              {submitting ? 'SIGNING UP…' : 'SIGN UP'}
            </button>
          </form>

          <p className="signup__footer">
            Already have an account?{' '}
            <button
              type="button"
              className="signup__link"
              onClick={() => onSwitchToSignIn?.()}
              disabled={submitting}
            >
              Sign In
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
