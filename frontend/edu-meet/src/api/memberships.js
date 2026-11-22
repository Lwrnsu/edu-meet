import { adminFetch } from './http'

export function listMemberships(query = {}) {
  return adminFetch('/api/php/school-memberships', { query })
}

export function createMembership(payload) {
  return adminFetch('/api/php/school-memberships', { method: 'POST', body: payload })
}

export function patchMembership(id, payload) {
  return adminFetch('/api/php/school-memberships', {
    method: 'PATCH',
    query: { id },
    body: payload,
  })
}

export function deleteMembership(id) {
  return adminFetch('/api/php/school-memberships', {
    method: 'DELETE',
    query: { id },
  })
}
