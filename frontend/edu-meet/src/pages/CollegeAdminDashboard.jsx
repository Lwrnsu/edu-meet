import { useEffect, useState } from 'react'
import { loadCollegeAdminOverview } from '../api/collegeAdminOverview'
import ManageCollegeDepartmentsSection from './ManageCollegeDepartmentsSection'
import ManageCollegeUsersSection from './ManageCollegeUsersSection'
import SecuritySection from './SecuritySection'
import './AdminDashboard.css'
import './CollegeAdminDashboard.css'

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

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 18c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M14.2 18c.4-1.7 1.6-2.9 3.4-3.3" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20V6.5L12 3l8 3.5V20" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 10h.01M15 10h.01M9 13.5h.01M15 13.5h.01" />
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

function IconStudents() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 3L2 8l10 5 8-4v6h2V8L12 3z" />
      <path d="M6 12.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-3.5" opacity="0.85" />
    </svg>
  )
}

function IconFaculty() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3.2 3.6-4.8 7-4.8s5.8 1.6 7 4.8" />
    </svg>
  )
}

function IconDept() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h16" />
      <path d="M6 20V8l6-3 6 3v12" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

function displayName(user) {
  const parts = [user?.first_name, user?.last_name].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return user?.email || 'College Admin'
}

export default function CollegeAdminDashboard({ user, onLogout }) {
  const [section, setSection] = useState('dashboard')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalFaculty, setTotalFaculty] = useState(0)
  const [departmentCount, setDepartmentCount] = useState(0)
  const [departments, setDepartments] = useState([])

  const schoolId = user?.school?.school_id
  const profileName = displayName(user)

  const pageTitle =
    section === 'users'
      ? 'Manage Users'
      : section === 'departments'
        ? 'Departments'
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
      if (event.key === 'Escape') closeLogoutConfirm()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [logoutConfirmOpen])

  useEffect(() => {
    if (section !== 'dashboard') return undefined

    let cancelled = false

    async function loadOverview() {
      setLoading(true)
      setError('')
      try {
        const data = await loadCollegeAdminOverview(schoolId)
        if (cancelled) return
        setTotalStudents(data.totalStudents)
        setTotalFaculty(data.totalFaculty)
        setDepartmentCount(data.departmentCount)
        setDepartments(data.departments)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
          setTotalStudents(0)
          setTotalFaculty(0)
          setDepartmentCount(0)
          setDepartments([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOverview()
    return () => {
      cancelled = true
    }
  }, [section, schoolId])

  return (
    <div className="college-dash">
      <aside className="college-dash__sidebar">
        <div className="college-dash__brand">
          <span className="college-dash__brand-mark">
            <IconGrid />
          </span>
          <div className="college-dash__brand-text">
            <p className="college-dash__brand-title">College Admin</p>
            <p className="college-dash__brand-sub">Control Panel</p>
          </div>
        </div>

        <nav className="college-dash__nav" aria-label="College admin">
          <button
            type="button"
            className={`college-dash__nav-item${section === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => setSection('dashboard')}
            aria-label="Dashboard"
          >
            <IconGrid />
            <span className="college-dash__nav-label">Dashboard</span>
          </button>
          <button
            type="button"
            className={`college-dash__nav-item college-dash__nav-item--outline${section === 'users' ? ' is-active' : ''}`}
            onClick={() => setSection('users')}
            aria-label="Manage Users"
          >
            <IconUsers />
            <span className="college-dash__nav-label">Manage Users</span>
          </button>
          <button
            type="button"
            className={`college-dash__nav-item college-dash__nav-item--outline${section === 'departments' ? ' is-active' : ''}`}
            onClick={() => setSection('departments')}
            aria-label="Departments"
          >
            <IconBuilding />
            <span className="college-dash__nav-label">Departments</span>
          </button>
          <button
            type="button"
            className={`college-dash__nav-item college-dash__nav-item--outline${section === 'security' ? ' is-active' : ''}`}
            onClick={() => setSection('security')}
            aria-label="Security"
          >
            <IconLock />
            <span className="college-dash__nav-label">Security</span>
          </button>
        </nav>

        <button
          type="button"
          className="college-dash__logout"
          onClick={() => setLogoutConfirmOpen(true)}
          aria-label="Logout"
        >
          <IconLogout />
          <span className="college-dash__nav-label">Logout</span>
        </button>
      </aside>

      <main className="college-dash__main">
        <header className="college-dash__topbar">
          <h1 className="college-dash__page-title">{pageTitle}</h1>
          <div className="college-dash__profile">
            <span className="college-dash__avatar">
              <IconUser />
            </span>
            <div>
              <p className="college-dash__profile-name">{profileName}</p>
              <p className="college-dash__profile-role">Administrator</p>
            </div>
          </div>
        </header>

        {section === 'users' ? (
          <ManageCollegeUsersSection schoolId={schoolId} />
        ) : section === 'departments' ? (
          <ManageCollegeDepartmentsSection schoolId={schoolId} />
        ) : section === 'security' ? (
          <SecuritySection user={user} />
        ) : section === 'dashboard' ? (
          <>
            <h2 className="college-dash__welcome">Welcome back, College Administrator!</h2>
            {user?.school?.name ? (
              <p className="college-dash__school">{user.school.name}</p>
            ) : null}
            {error ? (
              <p className="college-dash__api-error" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? <p className="college-dash__api-status">Loading overview…</p> : null}

            <section className="college-dash__stats" aria-label="Overview stats">
              <article className="college-dash__stat college-dash__stat--students">
                <span className="college-dash__stat-icon">
                  <IconStudents />
                </span>
                <p className="college-dash__stat-value">{totalStudents.toLocaleString('en-US')}</p>
                <p className="college-dash__stat-label">Total Students</p>
              </article>

              <article className="college-dash__stat college-dash__stat--faculty">
                <span className="college-dash__stat-icon">
                  <IconFaculty />
                </span>
                <p className="college-dash__stat-value">{totalFaculty.toLocaleString('en-US')}</p>
                <p className="college-dash__stat-label">Total Faculty</p>
              </article>

              <article className="college-dash__stat college-dash__stat--depts">
                <span className="college-dash__stat-icon">
                  <IconDept />
                </span>
                <p className="college-dash__stat-value">{departmentCount.toLocaleString('en-US')}</p>
                <p className="college-dash__stat-label">Departments</p>
              </article>
            </section>

            <section className="college-dash__panel" aria-label="Department overview">
              <div className="college-dash__panel-head">
                <h3 className="college-dash__panel-title">Department Overview</h3>
                <p className="college-dash__panel-sub">Registered departments in your college.</p>
              </div>

              <ul className="college-dash__dept-list">
                {departments.map((dept) => (
                  <li key={dept.id} className="college-dash__dept-item">
                    <span className="college-dash__dept-name">{dept.slug}</span>
                    <span className="college-dash__dept-count">
                      {dept.studentCount.toLocaleString('en-US')}
                    </span>
                  </li>
                ))}
                {!loading && departments.length === 0 ? (
                  <li className="college-dash__dept-item college-dash__dept-item--empty">
                    <span className="college-dash__dept-name">No departments yet</span>
                    <span className="college-dash__dept-count">0</span>
                  </li>
                ) : null}
              </ul>

              <div className="college-dash__panel-foot">
                <button
                  type="button"
                  className="college-dash__view-all"
                  onClick={() => setSection('departments')}
                >
                  View All Departments
                  <IconArrow />
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="college-dash__empty">
            <h2 className="college-dash__empty-title">{pageTitle}</h2>
            <p className="college-dash__empty-text">This section will be available in a later update.</p>
          </div>
        )}
      </main>

      {logoutConfirmOpen ? (
        <div
          className="college-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLogoutConfirm()
          }}
        >
          <div
            className="college-dash-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="college-logout-confirm-title"
          >
            <h3 id="college-logout-confirm-title" className="college-dash-modal__title">
              Are you sure you want to logout?
            </h3>
            <div className="college-dash-modal__divider" />
            <div className="college-dash-modal__actions">
              <button
                type="button"
                className="college-dash-modal__btn college-dash-modal__btn--confirm"
                onClick={confirmLogout}
              >
                Confirm
              </button>
              <button
                type="button"
                className="college-dash-modal__btn college-dash-modal__btn--secondary"
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
