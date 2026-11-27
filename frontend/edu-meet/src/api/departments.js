import { adminFetch } from './http'

export function listDepartments(query = {}) {
  return adminFetch('/api/php/departments', { query })
}
