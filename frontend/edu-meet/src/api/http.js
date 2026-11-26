import {
  JAVA_API_BASE_URL,
  clearAdminTokens,
  clearUserTokens,
  getAdminTokens,
  getUserTokens,
} from './auth'

function buildUrl(path, query) {
  const url = new URL(`${JAVA_API_BASE_URL}${path}`)
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

async function parseBody(response) {
  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function rawFetch(path, { method = 'GET', body, query, bearerToken } = {}) {
  const headers = {}
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = await parseBody(response)
  return { response, data }
}

async function authedFetch(path, options, { getTokens, clearTokens }) {
  const tokens = getTokens()
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    throw new Error('Not authenticated. Please log in again.')
  }

  let bearerToken = tokens.accessToken || undefined
  let { response, data } = await rawFetch(path, { ...options, bearerToken })

  if (response.status === 401) {
    // Redis restoreSession() no longer returns a PHP JWT access_token.
    clearTokens()
    throw new Error('Session expired. Please log in again.')
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.')
  }

  return data
}

export async function adminFetch(path, options = {}) {
  return authedFetch(path, options, {
    getTokens: getAdminTokens,
    clearTokens: clearAdminTokens,
  })
}

/** School-portal sessions (College Admin, Faculty, Student, etc.). */
export async function userFetch(path, options = {}) {
  return authedFetch(path, options, {
    getTokens: getUserTokens,
    clearTokens: clearUserTokens,
  })
}
