import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { logoutRequest, restoreSession } from '../api/auth'

export const ADMIN_LOGIN_PATH = '/login/system_admin'
export const ADMIN_APP_PATH = '/system_admin'
export const USER_LOGIN_PATH = '/login'
export const USER_PORTAL_PATH = '/lobby'
export const SIGNUP_PATH = '/'
export const FORGOT_PATH = '/forgot'
export const RESET_PATH = '/reset'

const PORTAL_KEY = 'edu_meet_portal'
const SCHOOL_ROLE_KEY = 'edu_meet_school_role'

const AuthContext = createContext(null)

function normalizePath(pathname) {
  const path = pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

function isAdminLoginPath(pathname) {
  return normalizePath(pathname) === ADMIN_LOGIN_PATH
}

function isAdminAppPath(pathname) {
  const path = normalizePath(pathname)
  return path === ADMIN_APP_PATH || path.startsWith(`${ADMIN_APP_PATH}/`)
}

function isPublicAuthPath(pathname) {
  const path = normalizePath(pathname)
  return (
    path === SIGNUP_PATH ||
    path === USER_LOGIN_PATH ||
    path === ADMIN_LOGIN_PATH ||
    path === FORGOT_PATH ||
    path === RESET_PATH
  )
}

function getStoredPortal() {
  return sessionStorage.getItem(PORTAL_KEY)
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
  return data.role || user?.role || sessionStorage.getItem(SCHOOL_ROLE_KEY) || null
}

function RestoringSession() {
  return (
    <main className="home">
      <div className="home__panel">
        <p className="home__brand">Edu-Meet</p>
        <p className="home__email">Restoring session...</p>
      </div>
    </main>
  )
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtpHint, setResetOtpHint] = useState('')
  const [forgotReturnView, setForgotReturnView] = useState(
    isAdminLoginPath(window.location.pathname) ? 'admin-login' : 'login'
  )
  const [portal, setPortal] = useState(() => getStoredPortal())
  const [schoolRole, setSchoolRole] = useState(() => sessionStorage.getItem(SCHOOL_ROLE_KEY))

  useEffect(() => {
    let cancelled = false

    restoreSession()
      .then((data) => {
        if (cancelled) return

        const nextUser = withSchoolContext(data.user, data)
        setUser(nextUser)

        const stored = getStoredPortal()
        if (stored) {
          setPortal(stored)
        } else if (isAdminAppPath(window.location.pathname) || isAdminLoginPath(window.location.pathname)) {
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
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (checking || !user) return

    const path = normalizePath(location.pathname)
    if (portal === 'admin' && isPublicAuthPath(path)) {
      navigate(ADMIN_APP_PATH, { replace: true })
      return
    }
    if (portal === 'user' && isPublicAuthPath(path)) {
      navigate(USER_PORTAL_PATH, { replace: true })
    }
  }, [checking, user, portal, location.pathname, navigate])

  useEffect(() => {
    const path = normalizePath(location.pathname)
    if (path === ADMIN_LOGIN_PATH) {
      setForgotReturnView('admin-login')
    } else if (path === USER_LOGIN_PATH) {
      setForgotReturnView('login')
    }
  }, [location.pathname])

  function goToAdminLogin() {
    setForgotReturnView('admin-login')
    navigate(ADMIN_LOGIN_PATH)
  }

  function goToUserLogin() {
    setForgotReturnView('login')
    navigate(USER_LOGIN_PATH)
  }

  function goToSignUp() {
    navigate(SIGNUP_PATH)
  }

  function goToAdminApp() {
    navigate(ADMIN_APP_PATH)
  }

  function goToUserPortal() {
    navigate(USER_PORTAL_PATH)
  }

  function handleAdminLoginSuccess(data) {
    sessionStorage.setItem(PORTAL_KEY, 'admin')
    sessionStorage.removeItem(SCHOOL_ROLE_KEY)
    setPortal('admin')
    setSchoolRole(null)
    setUser(data.user)
    goToAdminApp()
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
    goToUserPortal()
  }

  function openForgot(fromView) {
    setForgotReturnView(fromView)
    navigate(FORGOT_PATH)
  }

  function handleOtpSent(email, meta = {}) {
    setResetEmail(email)
    setResetOtpHint(meta.message || '')
    navigate(RESET_PATH)
  }

  function returnFromForgotOrReset() {
    setResetEmail('')
    setResetOtpHint('')
    if (forgotReturnView === 'admin-login') {
      goToAdminLogin()
      return
    }
    goToUserLogin()
  }

  function handleResetSuccess() {
    returnFromForgotOrReset()
  }

  async function handleLogout() {
    const wasAdmin =
      portal === 'admin' ||
      isAdminAppPath(location.pathname) ||
      isAdminLoginPath(location.pathname)
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

  const value = {
    user,
    checking,
    portal,
    schoolRole,
    resetEmail,
    resetOtpHint,
    forgotReturnView,
    goToAdminLogin,
    goToUserLogin,
    goToSignUp,
    goToAdminApp,
    goToUserPortal,
    handleAdminLoginSuccess,
    handleUserLoginSuccess,
    openForgot,
    handleOtpSent,
    returnFromForgotOrReset,
    handleResetSuccess,
    handleLogout,
  }

  if (checking) {
    return <RestoringSession />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
