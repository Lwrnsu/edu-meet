export const JAVA_API_BASE_URL =
  import.meta.env.VITE_JAVA_API_BASE_URL || 'http://localhost:8080'

const ADMIN_ACCESS_KEY = 'edu_meet_admin_access_token'
const ADMIN_REFRESH_KEY = 'edu_meet_admin_refresh_token'
const USER_ACCESS_KEY = 'edu_meet_user_access_token'
const USER_REFRESH_KEY = 'edu_meet_user_refresh_token'
const REDIS_TOKEN_KEY = 'edu_meet_redis_token'
const CACHED_USER_KEY = 'edu_meet_cached_user'

export function getAdminTokens() {
  const accessToken = sessionStorage.getItem(ADMIN_ACCESS_KEY)
  const refreshToken = sessionStorage.getItem(ADMIN_REFRESH_KEY)
  return !accessToken && !refreshToken ? null : { accessToken, refreshToken }
}

export function storeAdminTokens(data = {}) {
  if (data.access_token) sessionStorage.setItem(ADMIN_ACCESS_KEY, data.access_token)
  if (data.refresh_token) sessionStorage.setItem(ADMIN_REFRESH_KEY, data.refresh_token)
}

export function clearAdminTokens() {
  sessionStorage.removeItem(ADMIN_ACCESS_KEY)
  sessionStorage.removeItem(ADMIN_REFRESH_KEY)
}

export function getUserTokens() {
  const accessToken = sessionStorage.getItem(USER_ACCESS_KEY)
  const refreshToken = sessionStorage.getItem(USER_REFRESH_KEY)
  return !accessToken && !refreshToken ? null : { accessToken, refreshToken }
}

export function storeUserTokens(data = {}) {
  if (data.access_token) sessionStorage.setItem(USER_ACCESS_KEY, data.access_token)
  if (data.refresh_token) sessionStorage.setItem(USER_REFRESH_KEY, data.refresh_token)
}

export function clearUserTokens() {
  sessionStorage.removeItem(USER_ACCESS_KEY)
  sessionStorage.removeItem(USER_REFRESH_KEY)
}

function saveRedisSession(response, data) {
  const authHeader = response.headers.get('Authorization')
  if (authHeader) {
    localStorage.setItem(REDIS_TOKEN_KEY, authHeader)
  }
  if (data?.user) {
    localStorage.setItem(
      CACHED_USER_KEY,
      JSON.stringify({
        ...data.user,
        role: data.role ?? data.user.role ?? null,
        role_label: data.role_label ?? data.user.role_label ?? null,
        school: data.school ?? data.user.school ?? null,
      })
    )
  }
}

function clearRedisSession() {
  localStorage.removeItem(REDIS_TOKEN_KEY)
  localStorage.removeItem(CACHED_USER_KEY)
  clearUserTokens()
  clearAdminTokens()
}

export async function login(email, password) {
  clearRedisSession()

  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/php-school-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed.')

  saveRedisSession(response, data)
  return data
}

export async function systemAdminLogin(email, password) {
  clearRedisSession()

  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/php-system-admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed.')

  saveRedisSession(response, data)
  return data
}

export async function signup(payload) {
  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/php-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed.')
  return data
}

export async function restoreSession() {
  const redisToken = localStorage.getItem(REDIS_TOKEN_KEY)
  if (!redisToken) {
    throw new Error('No active session.')
  }

  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/logIn/cached`, {
    method: 'GET',
    headers: { Authorization: redisToken },
  })

  if (!response.ok) {
    clearRedisSession()
    throw new Error('Session expired.')
  }

  const cached = await response.json().catch(() => ({}))
  let savedUser = null
  try {
    savedUser = JSON.parse(localStorage.getItem(CACHED_USER_KEY) || 'null')
  } catch {
    savedUser = null
  }
  return {
    user: savedUser || { id: cached.body?.id, role: cached.body?.role },
    role: cached.body?.role || savedUser?.role || null,
  }
}

export async function logoutRequest() {
  const redisToken = localStorage.getItem(REDIS_TOKEN_KEY)
  try {
    if (redisToken) {
      await fetch(`${JAVA_API_BASE_URL}/api/auth/logOut`, {
        method: 'POST',
        headers: { Authorization: redisToken },
      }).catch(() => {})
    }
  } finally {
    clearRedisSession()
  }
}
