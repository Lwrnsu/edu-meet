import { adminFetch } from './http'

export function listSchools() {
  return adminFetch('/api/php/schools')
}

export function createSchool(payload) {
  return adminFetch('/api/php/schools', { method: 'POST', body: payload })
}

export function patchSchool(id, payload) {
  return adminFetch('/api/php/schools', {
    method: 'PATCH',
    query: { id },
    body: payload,
  })
}

export function deleteSchool(id) {
  return adminFetch('/api/php/schools', {
    method: 'DELETE',
    query: { id },
  })
}

export function mapSchoolFromApi(school, { totalUsers = 0, departments = 0 } = {}) {
  return {
    id: school.school_id,
    name: school.name,
    address: school.location,
    email: school.email,
    slug: school.slug,
    status: Number(school.status) === 1 ? 'approved' : 'pending',
    totalUsers,
    departments,
    raw: school,
  }
}
