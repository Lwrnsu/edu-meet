import { userFetch } from './http'
import { normalizeRoleKey } from './roles'

function displayName(user) {
  const parts = [user?.first_name, user?.middle_name, user?.last_name, user?.suffix]
    .map((part) => (part || '').trim())
    .filter(Boolean)
  return parts.join(' ') || user?.email || 'User'
}

function isActive(row) {
  return Number(row?.status) === 1
}

function isCollegeDean(roleName) {
  return normalizeRoleKey(roleName) === 'collegedean'
}

function isFaculty(roleName) {
  return normalizeRoleKey(roleName) === 'faculty'
}

function isStudent(roleName) {
  return normalizeRoleKey(roleName) === 'student'
}

/** Build A-Z0-9 slug (max 32) from a department name. */
export function slugFromDepartmentName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return ''

  const compact = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (/^[A-Z0-9]+$/.test(trimmed.replace(/\s+/g, '')) && compact.length <= 32) {
    return compact.slice(0, 32)
  }

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    const acronym = words
      .map((word) => word.replace(/[^A-Za-z0-9]/g, '')[0] || '')
      .join('')
      .toUpperCase()
    if (acronym) return acronym.slice(0, 32)
  }

  return (compact || 'DEPT').slice(0, 32)
}

function uniqueSlug(base, existingSlugs) {
  const used = new Set((existingSlugs || []).map((s) => String(s).toUpperCase()))
  let candidate = base || 'DEPT'
  if (!used.has(candidate)) return candidate

  let n = 2
  while (n < 1000) {
    const suffix = String(n)
    const next = `${candidate.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`
    if (!used.has(next)) return next
    n += 1
  }
  return `${candidate.slice(0, 28)}${Date.now().toString().slice(-4)}`
}

export async function loadCollegeDepartments(schoolId) {
  const id = Number(schoolId)
  if (!id) throw new Error('No school is linked to this account.')

  const [departmentsRaw, membershipsRaw, usersRaw] = await Promise.all([
    userFetch('/api/php/departments', { query: { school_id: id } }),
    userFetch('/api/php/school-memberships', { query: { school_id: id } }),
    userFetch('/api/php/users'),
  ])

  const departments = (Array.isArray(departmentsRaw) ? departmentsRaw : []).filter(
    (dept) => dept?.status === undefined || Number(dept.status) === 1
  )
  const memberships = (Array.isArray(membershipsRaw) ? membershipsRaw : []).filter(isActive)
  const users = Array.isArray(usersRaw) ? usersRaw : []
  const userById = new Map(users.map((user) => [Number(user.user_id), user]))

  const deanByDept = new Map()
  const deanMembershipByDept = new Map()
  const facultyByDept = new Map()
  const studentByDept = new Map()
  const deanOptions = []

  for (const row of memberships) {
    const roleName = row.role_name || ''
    const deptId = row.department_id != null ? Number(row.department_id) : null
    const user = userById.get(Number(row.user_id))
    const name = displayName(user)
    const membershipId = Number(row.membership_id)

    if (isCollegeDean(roleName)) {
      deanOptions.push({
        membershipId,
        userId: Number(row.user_id),
        name,
        departmentId: deptId,
      })
      if (deptId && !deanByDept.has(deptId)) {
        deanByDept.set(deptId, name)
        deanMembershipByDept.set(deptId, membershipId)
      }
    } else if (isFaculty(roleName) && deptId) {
      facultyByDept.set(deptId, (facultyByDept.get(deptId) || 0) + 1)
    } else if (isStudent(roleName) && deptId) {
      studentByDept.set(deptId, (studentByDept.get(deptId) || 0) + 1)
    }
  }

  deanOptions.sort((a, b) => a.name.localeCompare(b.name))

  const list = departments
    .map((dept) => {
      const deptId = Number(dept.department_id)
      return {
        id: deptId,
        name: dept.name || '',
        slug: dept.slug || dept.name || `Dept ${deptId}`,
        dean: deanByDept.get(deptId) || '—',
        deanMembershipId: deanMembershipByDept.get(deptId) || null,
        facultyCount: facultyByDept.get(deptId) || 0,
        studentCount: studentByDept.get(deptId) || 0,
        createdAt: dept.created_at || null,
      }
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))

  return {
    departments: list,
    deanOptions,
    existingSlugs: departments.map((dept) => dept.slug).filter(Boolean),
  }
}

export async function createCollegeDepartment({ schoolId, name, deanMembershipId }) {
  const id = Number(schoolId)
  if (!id) throw new Error('No school is linked to this account.')

  const deptName = String(name || '').trim()
  if (!deptName) throw new Error('Department name is required.')

  const membershipId = Number(deanMembershipId)
  if (!membershipId) throw new Error('College Dean is required.')

  const existing = await userFetch('/api/php/departments', { query: { school_id: id } })
  const existingSlugs = (Array.isArray(existing) ? existing : []).map((dept) => dept.slug)
  const slug = uniqueSlug(slugFromDepartmentName(deptName), existingSlugs)

  const department = await userFetch('/api/php/departments', {
    method: 'POST',
    body: {
      school_id: id,
      name: deptName,
      slug,
      status: 1,
    },
  })

  try {
    await userFetch('/api/php/school-memberships', {
      method: 'PATCH',
      query: { id: membershipId },
      body: { department_id: Number(department.department_id) },
    })
  } catch (error) {
    try {
      await userFetch('/api/php/departments', {
        method: 'DELETE',
        query: { id: department.department_id },
      })
    } catch {
      // best-effort cleanup
    }
    throw error
  }

  return department
}

export async function updateCollegeDepartment({
  schoolId,
  departmentId,
  name,
  deanMembershipId,
  previousDeanMembershipId,
}) {
  const school = Number(schoolId)
  const deptId = Number(departmentId)
  if (!school) throw new Error('No school is linked to this account.')
  if (!deptId) throw new Error('Department id is required.')

  const deptName = String(name || '').trim()
  if (!deptName) throw new Error('Department name is required.')

  const nextDeanId = Number(deanMembershipId)
  if (!nextDeanId) throw new Error('College Dean is required.')

  const existing = await userFetch('/api/php/departments', { query: { school_id: school } })
  const existingSlugs = (Array.isArray(existing) ? existing : [])
    .filter((dept) => Number(dept.department_id) !== deptId)
    .map((dept) => dept.slug)
  const slug = uniqueSlug(slugFromDepartmentName(deptName), existingSlugs)

  const department = await userFetch('/api/php/departments', {
    method: 'PATCH',
    query: { id: deptId },
    body: {
      school_id: school,
      name: deptName,
      slug,
      status: 1,
    },
  })

  const previousDeanId = previousDeanMembershipId ? Number(previousDeanMembershipId) : null
  if (previousDeanId && previousDeanId !== nextDeanId) {
    await userFetch('/api/php/school-memberships', {
      method: 'PATCH',
      query: { id: previousDeanId },
      body: { department_id: null },
    })
  }

  await userFetch('/api/php/school-memberships', {
    method: 'PATCH',
    query: { id: nextDeanId },
    body: { department_id: deptId },
  })

  return department
}

export async function removeCollegeDepartment({ departmentId, deanMembershipId }) {
  const deptId = Number(departmentId)
  if (!deptId) throw new Error('Department id is required.')

  const previousDeanId = deanMembershipId ? Number(deanMembershipId) : null
  if (previousDeanId) {
    try {
      await userFetch('/api/php/school-memberships', {
        method: 'PATCH',
        query: { id: previousDeanId },
        body: { department_id: null },
      })
    } catch {
      // still attempt department delete
    }
  }

  await userFetch('/api/php/departments', {
    method: 'DELETE',
    query: { id: deptId },
  })
}
