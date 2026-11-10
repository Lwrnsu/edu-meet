import { useState } from 'react'
import './SignUpPage.css'

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  middleName: '',
  extensionName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  schoolName: '',
  department: '',
  yearLevel: '',
  schoolId: '',
  acceptedTerms: false,
}

export default function SignUpPage({ onSwitchToSignIn }) {
  const [step, setStep] = useState(1)
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

  function handleStep1Continue(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim()
    const username = form.username.trim()
    const { password, confirmPassword } = form

    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setStep(2)
  }

  function handleStep2Submit(event) {
    event.preventDefault()
    setError('')
    setInfo('')

    const schoolName = form.schoolName.trim()
    const department = form.department.trim()
    const yearLevel = form.yearLevel.trim()
    const schoolId = form.schoolId.trim()

    if (!schoolName || !department || !yearLevel || !schoolId) {
      setError('Please fill in all required fields.')
      return
    }

    if (!form.acceptedTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }

    setInfo('Account creation is coming soon.')
  }

  function preventNav(event) {
    event.preventDefault()
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

          {step === 1 ? (
            <form className="signup__form" onSubmit={handleStep1Continue} noValidate>
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
                />
                <input
                  className="signup__input"
                  type="text"
                  name="middleName"
                  placeholder="Middle Name"
                  autoComplete="additional-name"
                  value={form.middleName}
                  onChange={updateField('middleName')}
                />
                <input
                  className="signup__input"
                  type="text"
                  name="extensionName"
                  placeholder="Extension Name"
                  value={form.extensionName}
                  onChange={updateField('extensionName')}
                />
                <input
                  className="signup__input"
                  type="email"
                  name="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField('email')}
                  required
                />
                <input
                  className="signup__input"
                  type="text"
                  name="username"
                  placeholder="Username"
                  autoComplete="username"
                  value={form.username}
                  onChange={updateField('username')}
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

              {error ? (
                <p className="signup__message signup__message--error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="signup__submit" type="submit">
                CONTINUE
              </button>
            </form>
          ) : (
            <form className="signup__form" onSubmit={handleStep2Submit} noValidate>
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
                  name="department"
                  placeholder="Department"
                  value={form.department}
                  onChange={updateField('department')}
                  required
                />
                <input
                  className="signup__input"
                  type="text"
                  name="yearLevel"
                  placeholder="Year Level"
                  value={form.yearLevel}
                  onChange={updateField('yearLevel')}
                  required
                />
                <input
                  className="signup__input"
                  type="text"
                  name="schoolId"
                  placeholder="School ID"
                  value={form.schoolId}
                  onChange={updateField('schoolId')}
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
          )}

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
