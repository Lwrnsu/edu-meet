import { useEffect, useState } from 'react'
import { loadSchoolsForAdmin } from '../api/schoolsAdmin'
import { listUsers } from '../api/users'
import eduMeetLogo from '../assets/brand/edu-meet-logo.png'
import ManageAdminsSection from './ManageAdminsSection'
import ManageSchoolsSection from './ManageSchoolsSection'
import SecuritySection from './SecuritySection'
import './AdminDashboard.css'

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="14" y="3" width="7" height="7" rx="1.2" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" />
      <rect x="14" y="14" width="7" height="7" rx="1.2" />
    </svg>
  )
}

function IconSchool() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10l9-5 9 5-9 5-9-5z" />
      <path d="M7 12.5V17c0 .8 2.2 2 5 2s5-1.2 5-2v-4.5" />
    </svg>
  )
}

function IconKey() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="8" cy="10" r="3.2" />
      <path d="M10.5 10H20v2.2h-2V15h-2.2v-2.8H12" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 18c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M14.2 18c.4-1.7 1.6-2.9 3.4-3.3" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 5H6a2 2 0 00-2 2v10a2 2 0 002 2h4" />
      <path d="M14 16l4-4-4-4" />
      <path d="M18 12H9" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3.2 3.6-4.8 7-4.8s5.8 1.6 7 4.8" />
    </svg>
  )
}

export default function AdminDashboard({ user, onLogout }) {
  const [section, setSection] = useState('dashboard')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [totalUsers, setTotalUsers] = useState(0)
  const [registeredSchools, setRegisteredSchools] = useState(0)
  const [schoolRequests, setSchoolRequests] = useState([])

  const pageTitle =
    section === 'schools'
      ? 'Manage Schools'
      : section === 'admins'
        ? 'Manage Admins'
        : section === 'security'
          ? 'Security'
          : 'Dashboard'

  function closeLogoutConfirm() {
    setLogoutConfirmOpen(false)
  }

  function confirmLogout() {
    setLogoutConfirmOpen(false)
    onLogout?.()
  }

  useEffect(() => {
    if (!logoutConfirmOpen) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        closeLogoutConfirm()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [logoutConfirmOpen])

  useEffect(() => {
    if (section !== 'dashboard') return undefined

    let cancelled = false

    async function loadOverview() {
      setOverviewLoading(true)
      setOverviewError('')
      try {
        const [schools, users] = await Promise.all([loadSchoolsForAdmin(), listUsers()])
        if (cancelled) return
        setTotalUsers((users || []).length)
        setRegisteredSchools((schools || []).filter((school) => school.status === 'approved').length)
        setSchoolRequests(
          (schools || []).slice(0, 8).map((school) => ({
            id: school.id,
            name: school.name,
            status: school.status,
          }))
        )
      } catch (err) {
        if (!cancelled) {
          setOverviewError(err instanceof Error ? err.message : 'Failed to load dashboard.')
        }
      } finally {
        if (!cancelled) setOverviewLoading(false)
      }
    }

    loadOverview()
    return () => {
      cancelled = true
    }
  }, [section])

  return (
    <div className="admin-dash">
      <aside className="admin-dash__sidebar">
        <div className="admin-dash__brand">
          <span className="admin-dash__brand-mark">
            <img src={eduMeetLogo} alt="" className="admin-dash__brand-logo" />
          </span>
          <div className="admin-dash__brand-text">
            <p className="admin-dash__brand-title">Edu-Meet</p>
          </div>
        </div>

        <nav className="admin-dash__nav" aria-label="System admin">
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => setSection('dashboard')}
            aria-label="Dashboard"
          >
            <IconGrid />
            <span className="admin-dash__nav-label">Dashboard</span>
          </button>
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'schools' ? ' is-active' : ''}`}
            onClick={() => setSection('schools')}
            aria-label="Manage Schools"
          >
            <IconSchool />
            <span className="admin-dash__nav-label">Manage Schools</span>
          </button>
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'admins' ? ' is-active' : ''}`}
            onClick={() => setSection('admins')}
            aria-label="Manage Admins"
          >
            <IconKey />
            <span className="admin-dash__nav-label">Manage Admins</span>
          </button>
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'security' ? ' is-active' : ''}`}
            onClick={() => setSection('security')}
            aria-label="Security"
          >
            <IconLock />
            <span className="admin-dash__nav-label">Security</span>
          </button>
        </nav>

        <button
          type="button"
          className="admin-dash__logout"
          onClick={() => setLogoutConfirmOpen(true)}
          aria-label="Logout"
        >
          <IconLogout />
          <span className="admin-dash__nav-label">Logout</span>
        </button>
      </aside>

      <main className="admin-dash__main">
        <header className="admin-dash__topbar">
          <h1 className="admin-dash__page-title">{pageTitle}</h1>
          <div className="admin-dash__profile">
            <span className="admin-dash__avatar">
              <IconUser />
            </span>
            <div>
              <p className="admin-dash__profile-name">System Admin</p>
              <p className="admin-dash__profile-role">Administrator</p>
            </div>
          </div>
        </header>

        {section === 'dashboard' ? (
          <>
            <h2 className="admin-dash__welcome">Welcome back, System Administrator!</h2>
            {overviewError ? (
              <p className="admin-dash__api-error" role="alert">
                {overviewError}
              </p>
            ) : null}
            {overviewLoading ? <p className="admin-dash__api-status">Loading overview…</p> : null}

            <section className="admin-dash__stats" aria-label="Overview stats">
              <article className="admin-dash__stat admin-dash__stat--users">
                <span className="admin-dash__stat-icon">
                  <IconUsers />
                </span>
                <div>
                  <p className="admin-dash__stat-value">{totalUsers.toLocaleString('en-US')}</p>
                  <p className="admin-dash__stat-label">Total Users</p>
                  <p className="admin-dash__stat-meta">Across all registered schools</p>
                </div>
              </article>

              <article className="admin-dash__stat admin-dash__stat--schools">
                <span className="admin-dash__stat-icon">
                  <IconSchool />
                </span>
                <div>
                  <p className="admin-dash__stat-value">{registeredSchools.toLocaleString('en-US')}</p>
                  <p className="admin-dash__stat-label">Registered Schools</p>
                  <p className="admin-dash__stat-meta">Approved schools on the platform</p>
                </div>
              </article>
            </section>

            <section className="admin-dash__panel" aria-label="School registration requests">
              <div className="admin-dash__panel-head">
                <h3 className="admin-dash__panel-title">School Registration Request</h3>
                <p className="admin-dash__panel-sub">Review schools request to join Edu-Meet!</p>
              </div>

              <ul className="admin-dash__request-list">
                {schoolRequests.map((request) => (
                  <li key={request.id} className="admin-dash__request-item">
                    <div>
                      <p className="admin-dash__request-name">{request.name}</p>
                      <p className="admin-dash__request-meta">School registration request</p>
                    </div>
                    <span
                      className={`admin-dash__badge admin-dash__badge--${request.status}`}
                    >
                      {request.status === 'pending' ? 'Pending' : 'Approved'}
                    </span>
                  </li>
                ))}
                {!overviewLoading && schoolRequests.length === 0 ? (
                  <li className="admin-dash__request-item">
                    <div>
                      <p className="admin-dash__request-name">No school requests yet</p>
                      <p className="admin-dash__request-meta">New signups will appear here</p>
                    </div>
                  </li>
                ) : null}
              </ul>

              <div className="admin-dash__panel-foot">
                <button
                  type="button"
                  className="admin-dash__view-all"
                  onClick={() => setSection('schools')}
                >
                  View all schools →
                </button>
              </div>
            </section>
          </>
        ) : section === 'schools' ? (
          <ManageSchoolsSection />
        ) : section === 'admins' ? (
          <ManageAdminsSection />
        ) : section === 'security' ? (
          <SecuritySection user={user} />
        ) : (
          <div className="admin-dash__empty">
            <h2 className="admin-dash__empty-title">{pageTitle}</h2>
            <p className="admin-dash__empty-text">This section will be available in a later update.</p>
          </div>
        )}
      </main>

      {logoutConfirmOpen ? (
        <div
          className="admin-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLogoutConfirm()
          }}
        >
          <div
            className="admin-dash-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <h3 id="logout-confirm-title" className="admin-dash-modal__title">
              Are you sure you want to logout?
            </h3>
            <div className="admin-dash-modal__divider" />
            <div className="admin-dash-modal__actions">
              <button
                type="button"
                className="admin-dash-modal__btn admin-dash-modal__btn--confirm"
                onClick={confirmLogout}
              >
                Confirm
              </button>
              <button
                type="button"
                className="admin-dash-modal__btn admin-dash-modal__btn--secondary"
                onClick={closeLogoutConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
