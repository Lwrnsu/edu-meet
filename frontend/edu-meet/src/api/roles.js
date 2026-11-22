import { adminFetch } from './http'

export function listRoles() {
  return adminFetch('/api/php/roles')
}

export function listUserRoles(query = {}) {
  return adminFetch('/api/php/user-roles', { query })
}

export function createUserRole(payload) {
  return adminFetch('/api/php/user-roles', { method: 'POST', body: payload })
}

export function deleteUserRole(id) {
  return adminFetch('/api/php/user-roles', {
    method: 'DELETE',
    query: { id },
  })
}

export function normalizeRoleKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

export function findRoleIdByName(roles, targetName) {
  const target = normalizeRoleKey(targetName)
  const match = (roles || []).find((role) => normalizeRoleKey(role.name) === target)
  return match ? Number(match.role_id) : null
}
