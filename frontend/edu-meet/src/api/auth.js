export async function login(email, password) {
  const base = import.meta.env.VITE_API_BASE_URL
  const res = await fetch(`${base}/auth/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.message || 'Login failed')
    error.status = res.status
    error.details = data.details ?? null
    throw error
  }

  return data
}
