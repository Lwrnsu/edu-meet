import { useEffect, useState } from 'react'
import { logoutRequest, restoreSession } from './api/auth'
import AdminDashboard from './pages/AdminDashboard'
import AdminLoginPage from './pages/AdminLoginPage'
import CollegeAdminDashboard from './pages/CollegeAdminDashboard'
import CollegeDeanDashboard from './pages/CollegeDeanDashboard'
import FacultyDashboard from './pages/FacultyDashboard'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ProgramChairDashboard from './pages/ProgramChairDashboard'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignUpPage from './pages/SignUpPage'
import StudentDashboard from './pages/StudentDashboard'

const ADMIN_LOGIN_PATH = '/login/system_admin'
const ADMIN_APP_PATH = '/system_admin'
const USER_LOGIN_PATH = '/login'
const PORTAL_KEY = 'edu_meet_portal'
const SCHOOL_ROLE_KEY = 'edu_meet_school_role'

function normalizePath(pathname) {
  const path = pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

function isAdminLoginPath(pathname = window.location.pathname) {
  return normalizePath(pathname) === ADMIN_LOGIN_PATH
}

function isAdminAppPath(pathname = window.location.pathname) {
  const path = normalizePath(pathname)
  return path === ADMIN_APP_PATH || path.startsWith(`${ADMIN_APP_PATH}/`)
}

function getStoredPortal() {
  return sessionStorage.getItem(PORTAL_KEY)
}

function initialAuthView() {
  return isAdminLoginPath() ? 'admin-login' : 'signup'
}

function withSchoolContext(user, data = {}) {
  if (!user) return null
  return {
    ...user,
    role: data.role ?? user.role ?? null,
    role_label: data.role_label ?? user.role_label ?? null,
    school: data.school ?? user.school ?? null,
  }
}

function resolveSchoolRole(data = {}, user = null) {
  return (
    data.role ||
    user?.role ||
    sessionStorage.getItem(SCHOOL_ROLE_KEY) ||
    null
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [authView, setAuthView] = useState(initialAuthView)
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtpHint, setResetOtpHint] = useState('')
  const [forgotReturnView, setForgotReturnView] = useState(
    isAdminLoginPath() ? 'admin-login' : 'login'
  )
  const [portal, setPortal] = useState(() => getStoredPortal())
  const [schoolRole, setSchoolRole] = useState(
    () => sessionStorage.getItem(SCHOOL_ROLE_KEY)
  )

  useEffect(() => {
    let cancelled = false

    restoreSession()
      .then((data) => {
        if (!cancelled) {
          const nextUser = withSchoolContext(data.user, data)
          setUser(nextUser)
          const stored = getStoredPortal()
          if (stored) {
            setPortal(stored)
          } else if (isAdminAppPath() || isAdminLoginPath()) {
            sessionStorage.setItem(PORTAL_KEY, 'admin')
            setPortal('admin')
          } else {
            sessionStorage.setItem(PORTAL_KEY, 'user')
            setPortal('user')
          }

          const role = resolveSchoolRole(data, nextUser)
          if (role) {
            sessionStorage.setItem(SCHOOL_ROLE_KEY, role)
            setSchoolRole(role)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function syncFromUrl() {
      if (isAdminLoginPath()) {
        setAuthView('admin-login')
        setForgotReturnView('admin-login')
        return
      }

      if (normalizePath(window.location.pathname) === USER_LOGIN_PATH) {
        setAuthView('login')
      }
    }

    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  function goToAdminLogin() {
    if (!isAdminLoginPath()) {
      window.history.pushState({}, '', ADMIN_LOGIN_PATH)
    }
    setForgotReturnView('admin-login')
    setAuthView('admin-login')
  }

  function goToUserLogin() {
    if (normalizePath(window.location.pathname) !== USER_LOGIN_PATH) {
      window.history.pushState({}, '', USER_LOGIN_PATH)
    }
    setForgotReturnView('login')
    setAuthView('login')
  }

  function goToAdminApp() {
    if (!isAdminAppPath()) {
      window.history.pushState({}, '', ADMIN_APP_PATH)
    }
  }

  function handleAdminLoginSuccess(data) {
    sessionStorage.setItem(PORTAL_KEY, 'admin')
    sessionStorage.removeItem(SCHOOL_ROLE_KEY)
    setPortal('admin')
    setSchoolRole(null)
    goToAdminApp()
    setUser(data.user)
  }

  function handleUserLoginSuccess(data) {
    sessionStorage.setItem(PORTAL_KEY, 'user')
    setPortal('user')
    const nextUser = withSchoolContext(data.user, data)
    const role = resolveSchoolRole(data, nextUser)
    if (role) {
      sessionStorage.setItem(SCHOOL_ROLE_KEY, role)
      setSchoolRole(role)
    } else {
      sessionStorage.removeItem(SCHOOL_ROLE_KEY)
      setSchoolRole(null)
    }
    setUser(nextUser)
  }

  function openForgot(fromView) {
    setForgotReturnView(fromView)
    setAuthView('forgot')
  }

  function handleOtpSent(email, meta = {}) {
    setResetEmail(email)
    setResetOtpHint(meta.message || (meta.otp ? `Dev OTP: ${meta.otp}` : ''))
    setAuthView('reset')
  }

  function returnFromForgotOrReset() {
    setResetEmail('')
    setResetOtpHint('')
    if (forgotReturnView === 'admin-login') {
      goToAdminLogin()
      return
    }
    setAuthView('login')
  }

  function handleResetSuccess() {
    returnFromForgotOrReset()
  }

  async function handleLogout() {
    const wasAdmin = portal === 'admin' || isAdminAppPath() || isAdminLoginPath()
    await logoutRequest().catch(() => {})
    sessionStorage.removeItem(PORTAL_KEY)
    sessionStorage.removeItem(SCHOOL_ROLE_KEY)
    setPortal(null)
    setSchoolRole(null)
    setUser(null)
    if (wasAdmin) {
      goToAdminLogin()
    } else {
      goToUserLogin()
    }
  }

  if (checking) {
    return (
      <main className="home">
        <div className="home__panel">
          <p className="home__brand">Edu-Meet</p>
          <p className="home__email">Restoring session...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    if (authView === 'admin-login') {
      return (
        <AdminLoginPage
          onSuccess={handleAdminLoginSuccess}
          onForgotPassword={() => openForgot('admin-login')}
          onSwitchToUserLogin={goToUserLogin}
        />
      )
    }

    if (authView === 'login') {
      return (
        <LoginPage
          onSuccess={handleUserLoginSuccess}
          onSwitchToSignUp={() => setAuthView('signup')}
          onForgotPassword={() => openForgot('login')}
        />
      )
    }

    if (authView === 'forgot') {
      return (
        <ForgotPasswordPage
          onBackToLogin={returnFromForgotOrReset}
          onSwitchToSignUp={() => setAuthView('signup')}
          onOtpSent={handleOtpSent}
        />
      )
    }

    if (authView === 'reset') {
      return (
        <ResetPasswordPage
          email={resetEmail}
          otpHint={resetOtpHint}
          onCancel={returnFromForgotOrReset}
          onSuccess={handleResetSuccess}
        />
      )
    }

    return <SignUpPage onSwitchToSignIn={goToUserLogin} />
  }

  const isAdminPortal = portal === 'admin' || isAdminAppPath()

  if (isAdminPortal) {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  const role = schoolRole || user.role

  switch (role) {
    case 'college_admin':
      return <CollegeAdminDashboard user={user} onLogout={handleLogout} />
    case 'college_dean':
      return <CollegeDeanDashboard user={user} onLogout={handleLogout} />
    case 'program_chair':
      return <ProgramChairDashboard user={user} onLogout={handleLogout} />
    case 'faculty':
      return <FacultyDashboard user={user} onLogout={handleLogout} />
    case 'student':
      return <StudentDashboard user={user} onLogout={handleLogout} />
    default: {
      const name = user.first_name || user.email || 'there'
      return (
        <main className="home">
          <div className="home__panel">
            <p className="home__brand">Edu-Meet</p>
            <h1 className="home__greeting">Welcome back, {name}.</h1>
            <p className="home__email">{user.email}</p>
            <button className="home__logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </main>
      )
    }
  }
}

export default App
