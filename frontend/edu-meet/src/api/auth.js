const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost/edu-meet/backend/edu-meet/php/api'

export const JAVA_API_BASE_URL =
  import.meta.env.VITE_JAVA_API_BASE_URL || 'http://localhost:8080'

const ADMIN_ACCESS_KEY = 'edu_meet_admin_access_token'
const ADMIN_REFRESH_KEY = 'edu_meet_admin_refresh_token'
const USER_ACCESS_KEY = 'edu_meet_user_access_token'
const USER_REFRESH_KEY = 'edu_meet_user_refresh_token'

export function getAdminTokens() {
  const accessToken = sessionStorage.getItem(ADMIN_ACCESS_KEY)
  const refreshToken = sessionStorage.getItem(ADMIN_REFRESH_KEY)
  if (!accessToken && !refreshToken) {
    return null
  }
  return { accessToken, refreshToken }
}

export function storeAdminTokens(data = {}) {
  if (data.access_token) {
    sessionStorage.setItem(ADMIN_ACCESS_KEY, data.access_token)
  }
  if (data.refresh_token) {
    sessionStorage.setItem(ADMIN_REFRESH_KEY, data.refresh_token)
  }
}

export function clearAdminTokens() {
  sessionStorage.removeItem(ADMIN_ACCESS_KEY)
  sessionStorage.removeItem(ADMIN_REFRESH_KEY)
}

export function getUserTokens() {
  const accessToken = sessionStorage.getItem(USER_ACCESS_KEY)
  const refreshToken = sessionStorage.getItem(USER_REFRESH_KEY)
  if (!accessToken && !refreshToken) {
    return null
  }
  return { accessToken, refreshToken }
}

export function storeUserTokens(data = {}) {
  if (data.access_token) {
    sessionStorage.setItem(USER_ACCESS_KEY, data.access_token)
  }
  if (data.refresh_token) {
    sessionStorage.setItem(USER_REFRESH_KEY, data.refresh_token)
  }
}

export function clearUserTokens() {
  sessionStorage.removeItem(USER_ACCESS_KEY)
  sessionStorage.removeItem(USER_REFRESH_KEY)
}

async function post(path, payload = {}, { bearerToken } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  }
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export async function login(email, password) {
  clearAdminTokens()

  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/php-school-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  storeUserTokens(data)
  return data
}

export async function systemAdminLogin(email, password) {
  clearUserTokens()

  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/php-system-admin-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  storeAdminTokens(data)
  return data
}

export async function signup(payload) {
  const response = await fetch(`${JAVA_API_BASE_URL}/api/auth/php-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export async function restoreSession() {
  const userTokens = getUserTokens()
  if (userTokens) {
    try {
      const data = await post(
        '/auth/refresh.php',
        {
          access_token: userTokens.accessToken || undefined,
          refresh_token: userTokens.refreshToken || undefined,
        },
        { bearerToken: userTokens.accessToken || undefined }
      )
      storeUserTokens(data)
      return data
    } catch (error) {
      clearUserTokens()
      throw error
    }
  }

  const adminTokens = getAdminTokens()
  if (adminTokens) {
    try {
      const data = await post(
        '/auth/refresh.php',
        {
          access_token: adminTokens.accessToken || undefined,
          refresh_token: adminTokens.refreshToken || undefined,
        },
        { bearerToken: adminTokens.accessToken || undefined }
      )
      storeAdminTokens(data)
      return data
    } catch (error) {
      clearAdminTokens()
      throw error
    }
  }

  return post('/auth/refresh.php')
}

export async function logoutRequest() {
  const userTokens = getUserTokens()
  const adminTokens = getAdminTokens()
  try {
    if (userTokens) {
      return await post(
        '/auth/logout.php',
        {
          access_token: userTokens.accessToken || undefined,
          refresh_token: userTokens.refreshToken || undefined,
        },
        { bearerToken: userTokens.accessToken || undefined }
      )
    }
    if (adminTokens) {
      return await post(
        '/auth/logout.php',
        {
          access_token: adminTokens.accessToken || undefined,
          refresh_token: adminTokens.refreshToken || undefined,
        },
        { bearerToken: adminTokens.accessToken || undefined }
      )
    }
    return await post('/auth/logout.php')
  } finally {
    clearUserTokens()
    clearAdminTokens()
  }
}
