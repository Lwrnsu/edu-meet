import { JAVA_API_BASE_URL, getAdminTokens, getUserTokens } from './auth'
import { adminFetch, userFetch } from './http'

async function securityFetch(path, options = {}) {
  if (getUserTokens()) {
    return userFetch(path, options)
  }
  if (getAdminTokens()) {
    return adminFetch(path, options)
  }
  return userFetch(path, options)
}

async function publicAuthFetch(path, payload) {
  const response = await fetch(`${JAVA_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.')
  }

  return data
}

export function requestPasswordOtp(payload) {
  return securityFetch('/api/auth/php-request-password-otp', {
    method: 'POST',
    body: payload,
  })
}

export function verifyPasswordOtp(payload) {
  return securityFetch('/api/auth/php-verify-password-otp', {
    method: 'POST',
    body: payload,
  })
}

export function changePassword(payload) {
  return securityFetch('/api/auth/php-change-password', {
    method: 'POST',
    body: payload,
  })
}

export function requestForgotPasswordOtp(payload) {
  return publicAuthFetch('/api/auth/php-forgot-request-password-otp', payload)
}

export function verifyForgotPasswordOtp(payload) {
  return publicAuthFetch('/api/auth/php-forgot-verify-password-otp', payload)
}

export function resetForgotPassword(payload) {
  return publicAuthFetch('/api/auth/php-forgot-reset-password', payload)
}
