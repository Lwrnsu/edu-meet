import { adminFetch } from './http'

export function listUsers() {
  return adminFetch('/api/php/users')
}

export function createUser(payload) {
  return adminFetch('/api/php/users', { method: 'POST', body: payload })
}

export function patchUser(id, payload) {
  return adminFetch('/api/php/users', {
    method: 'PATCH',
    query: { id },
    body: payload,
  })
}

export function deleteUser(id) {
  return adminFetch('/api/php/users', {
    method: 'DELETE',
    query: { id },
  })
}
