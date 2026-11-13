const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost/edu-meet/backend/edu-meet/php/api'

async function post(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export function login(email, password) {
  return post('/auth/login.php', { email, password })
}

export function refreshSession(refreshToken) {
  return post('/auth/refresh.php', { refresh_token: refreshToken })
}

export function logoutRequest(refreshToken) {
  return post('/auth/logout.php', { refresh_token: refreshToken })
}
