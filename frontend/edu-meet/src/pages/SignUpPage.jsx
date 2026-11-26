import { useEffect, useState } from 'react'
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

function TermsOfServiceContent() {
  return (
    <>
      <p className="signup-legal-modal__updated">Last updated: November 26, 2026</p>
      <p>
        These Terms of Service govern your use of Edu-Meet, a school academic scheduling and
        meeting platform that helps institutions manage school accounts, roles, and related
        academic coordination.
      </p>

      <h4>1. About Edu-Meet</h4>
      <p>
        Edu-Meet provides tools for schools to register, request access, and operate with
        role-based permissions after approval. By creating an account or using the service, you
        agree to these terms.
      </p>

      <h4>2. Account registration and approval</h4>
      <p>
        When you sign up, you submit school and administrator details to create a pending school
        account. Access is not automatic. A System Admin must review and approve your request
        before the school portal can be used. Incomplete, inaccurate, or misleading information
        may result in delayed or denied approval.
      </p>

      <h4>3. Roles and access</h4>
      <p>
        After approval, Edu-Meet uses role-based access such as College Admin and other school
        roles assigned within your institution. You may only use features and data permitted for
        your role. You are responsible for actions taken under your account.
      </p>

      <h4>4. Acceptable use</h4>
      <p>You agree not to:</p>
      <ul>
        <li>Share login credentials or one-time verification codes with others</li>
        <li>Attempt to access schools, users, or data outside your authorized scope</li>
        <li>Misuse academic, membership, or account information stored in Edu-Meet</li>
        <li>Interfere with platform security, authentication, or approval workflows</li>
      </ul>

      <h4>5. Account security</h4>
      <p>
        Keep your password confidential. Edu-Meet may use email one-time passwords (OTP) for
        password changes and forgotten-password resets. Do not share OTP codes. Notify your
        System Admin or school administrator if you suspect unauthorized access.
      </p>

      <h4>6. Service changes and suspension</h4>
      <p>
        Edu-Meet may update features, policies, or availability as the platform evolves. Accounts
        may be suspended or restricted for misuse, security risk, or violation of these terms.
      </p>

      <h4>7. Contact</h4>
      <p>
        For questions about these Terms of Service, contact your System Admin or the Edu-Meet
        support channel provided by your institution.
      </p>
    </>
  )
}

function PrivacyPolicyContent() {
  return (
    <>
      <p className="signup-legal-modal__updated">Last updated: November 26, 2026</p>
      <p>
        This Privacy Policy explains how Edu-Meet collects, uses, and protects information when
        you register a school account or use the platform.
      </p>

      <h4>1. Information we collect</h4>
      <p>When you sign up, Edu-Meet may collect:</p>
      <ul>
        <li>Name details (first, middle, last name, and suffix if provided)</li>
        <li>Email address</li>
        <li>School name and location</li>
        <li>Password (stored only as a secure hash, never in plain text)</li>
      </ul>
      <p>
        During authentication and password recovery, Edu-Meet may also process verification codes
        and related reset records needed to confirm your identity.
      </p>

      <h4>2. How we use information</h4>
      <p>We use your information to:</p>
      <ul>
        <li>Create and manage your pending school registration</li>
        <li>Support System Admin review and approval</li>
        <li>Authenticate users and maintain sessions</li>
        <li>Send OTP emails for password change or forgot-password flows</li>
        <li>Maintain school membership and role assignments after approval</li>
      </ul>

      <h4>3. Authentication and OTP data</h4>
      <p>
        Passwords are stored as hashed values. Password reset and change flows may store hashed
        verification tokens with expiration and used/unused status so codes can be validated
        securely. Plain-text passwords and OTP codes are not retained as permanent account
        credentials.
      </p>

      <h4>4. Who can access your data</h4>
      <p>
        Access is limited by role. System Admins may review signup requests and manage school
        records. Within an approved school, authorized roles (such as College Admin) may manage
        users and school-related data according to their permissions. Other users cannot access
        your account outside their authorized scope.
      </p>

      <h4>5. Retention and deletion</h4>
      <p>
        Account and school data are retained while needed to operate Edu-Meet and meet
        administrative requirements. When accounts are removed through platform account-management
        flows, associated access is revoked according to those processes.
      </p>

      <h4>6. Your rights</h4>
      <p>
        You may review and update account information through available Edu-Meet account flows,
        and you may request help from a System Admin or school administrator for access,
        correction, or account concerns.
      </p>

      <h4>7. Contact</h4>
      <p>
        For privacy questions about Edu-Meet, contact your System Admin or the support channel
        provided by your institution.
      </p>
    </>
  )
}

export default function SignUpPage({ onSwitchToSignIn }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [legalModal, setLegalModal] = useState(null)

  function updateField(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }
  }

  function handleTermsChange(event) {
    setForm((prev) => ({ ...prev, acceptedTerms: event.target.checked }))
  }

  function openLegalModal(type) {
    return (event) => {
      event.preventDefault()
      event.stopPropagation()
      setLegalModal(type)
    }
  }

  function closeLegalModal() {
    setLegalModal(null)
  }

  useEffect(() => {
    if (!legalModal) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        closeLegalModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [legalModal])

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

  const legalTitle = legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'
  const legalTitleId = legalModal === 'terms' ? 'signup-terms-title' : 'signup-privacy-title'

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
                <button type="button" className="signup__legal" onClick={openLegalModal('terms')}>
                  Terms of Service
                </button>{' '}
                and our{' '}
                <button type="button" className="signup__legal" onClick={openLegalModal('privacy')}>
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

      {legalModal ? (
        <div
          className="signup-legal-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLegalModal()
          }}
        >
          <div
            className="signup-legal-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={legalTitleId}
          >
            <button
              type="button"
              className="signup-legal-modal__close"
              onClick={closeLegalModal}
              aria-label="Close"
            >
              ×
            </button>

            <h3 id={legalTitleId} className="signup-legal-modal__title">
              {legalTitle}
            </h3>

            <div className="signup-legal-modal__body">
              {legalModal === 'terms' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
            </div>

            <div className="signup-legal-modal__actions">
              <button type="button" className="signup-legal-modal__btn" onClick={closeLegalModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
