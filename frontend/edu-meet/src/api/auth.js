const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost/edu-meet/backend/edu-meet/php/api'

async function post(path, payload = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
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

export function systemAdminLogin(email, password) {
  return post('/auth/system_admin_login.php', { email, password })
}

export function restoreSession() {
  return post('/auth/refresh.php')
}

export function logoutRequest() {
  return post('/auth/logout.php')
}
