import { adminFetch } from './http'

export function requestPasswordOtp(payload) {
  return adminFetch('/api/auth/php-request-password-otp', {
    method: 'POST',
    body: payload,
  })
}

export function verifyPasswordOtp(payload) {
  return adminFetch('/api/auth/php-verify-password-otp', {
    method: 'POST',
    body: payload,
  })
}

export function changePassword(payload) {
  return adminFetch('/api/auth/php-change-password', {
    method: 'POST',
    body: payload,
  })
}
