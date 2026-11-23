import { getAdminTokens, getUserTokens } from './auth'
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
