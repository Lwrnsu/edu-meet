const TOKEN_KEY = 'edu_meet_token'
const REFRESH_TOKEN_KEY = 'edu_meet_refresh_token'
const USER_KEY = 'edu_meet_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSession({ token, refresh_token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  if (refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getSession() {
  const token = getToken()
  const user = getUser()
  if (!token || !user) return null
  return { token, refresh_token: getRefreshToken(), user }
}

export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true
  const parts = token.split('.')
  if (parts.length !== 3) return true
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    if (!payload.exp) return true
    return payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}
