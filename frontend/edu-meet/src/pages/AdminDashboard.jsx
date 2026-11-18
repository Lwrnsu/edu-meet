import { useState } from 'react'
import ManageSchoolsSection from './ManageSchoolsSection'
import './AdminDashboard.css'

const SCHOOL_REQUESTS = [
  { id: 1, name: 'Columban College', status: 'pending' },
  { id: 2, name: 'Gordon College', status: 'approved' },
]

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

export default function AdminDashboard({ onLogout }) {
  const [section, setSection] = useState('dashboard')

  const pageTitle =
    section === 'schools'
      ? 'Manage Schools'
      : section === 'admins'
        ? 'Manage Admins'
        : section === 'security'
          ? 'Security'
          : 'Dashboard'

  return (
    <div className="admin-dash">
      <aside className="admin-dash__sidebar">
        <div className="admin-dash__brand">
          <span className="admin-dash__brand-mark">
            <IconGrid />
          </span>
          <div className="admin-dash__brand-text">
            <p className="admin-dash__brand-title">System Admin</p>
            <p className="admin-dash__brand-sub">Control Panel</p>
          </div>
        </div>

        <nav className="admin-dash__nav" aria-label="System admin">
          <button
            type="button"
            className={`admin-dash__nav-item${section === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => setSection('dashboard')}
          >
            <IconGrid />
            Dashboard
          </button>
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'schools' ? ' is-active' : ''}`}
            onClick={() => setSection('schools')}
          >
            <IconSchool />
            Manage Schools
          </button>
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'admins' ? ' is-active' : ''}`}
            onClick={() => setSection('admins')}
          >
            <IconKey />
            Manage Admins
          </button>
          <button
            type="button"
            className={`admin-dash__nav-item admin-dash__nav-item--outline${section === 'security' ? ' is-active' : ''}`}
            onClick={() => setSection('security')}
          >
            <IconLock />
            Security
          </button>
        </nav>

        <button type="button" className="admin-dash__logout" onClick={() => onLogout?.()}>
          <IconLogout />
          Logout
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

            <section className="admin-dash__stats" aria-label="Overview stats">
              <article className="admin-dash__stat admin-dash__stat--users">
                <span className="admin-dash__stat-icon">
                  <IconUsers />
                </span>
                <div>
                  <p className="admin-dash__stat-value">12,345</p>
                  <p className="admin-dash__stat-label">Total Users</p>
                  <p className="admin-dash__stat-meta">Across all registered schools</p>
                </div>
              </article>

              <article className="admin-dash__stat admin-dash__stat--schools">
                <span className="admin-dash__stat-icon">
                  <IconSchool />
                </span>
                <div>
                  <p className="admin-dash__stat-value">5</p>
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
                {SCHOOL_REQUESTS.map((request) => (
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
        ) : (
          <div className="admin-dash__empty">
            <h2 className="admin-dash__empty-title">{pageTitle}</h2>
            <p className="admin-dash__empty-text">This section will be available in a later update.</p>
          </div>
        )}
      </main>
    </div>
  )
}
