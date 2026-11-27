import { passwordFromPersonalInfo } from './generatedPassword'
import { userFetch } from './http'
import { normalizeRoleKey } from './roles'

const SCHOOL_PORTAL_ROLE_KEYS = new Set([
  'schooladmin',
  'collegeadmin',
  'collegedean',
  'programchair',
  'faculty',
  'student',
])

const ROLE_LABELS = {
  schooladmin: 'College Admin',
  collegeadmin: 'College Admin',
  collegedean: 'College Dean',
  programchair: 'Program Chair',
  faculty: 'Faculty',
  student: 'Student',
}

function displayName(user) {
  const parts = [user?.first_name, user?.middle_name, user?.last_name, user?.suffix]
    .map((part) => (part || '').trim())
    .filter(Boolean)
  return parts.join(' ') || user?.email || 'User'
}

export function roleLabel(roleName) {
  const key = normalizeRoleKey(roleName)
  return ROLE_LABELS[key] || roleName || '—'
}

export function isSchoolPortalRole(roleName) {
  return SCHOOL_PORTAL_ROLE_KEYS.has(normalizeRoleKey(roleName))
}

export function roleRequiresDepartment(roleName) {
  const key = normalizeRoleKey(roleName)
  return key === 'student' || key === 'faculty' || key === 'programchair'
}

function findSchoolRoleId(roles, roleName) {
  const key = normalizeRoleKey(roleName)
  const active = (roles || []).filter((role) => Number(role.status) === 1)

  if (key === 'schooladmin' || key === 'collegeadmin') {
    const match =
      active.find((role) => normalizeRoleKey(role.name) === 'schooladmin') ||
      active.find((role) => normalizeRoleKey(role.name) === 'collegeadmin')
    return match ? Number(match.role_id) : null
  }

  const match = active.find((role) => normalizeRoleKey(role.name) === key)
  return match ? Number(match.role_id) : null
}

async function listUserRolesForUser(userId) {
  const rows = await userFetch('/api/php/user-roles', { query: { user_id: userId } })
  return Array.isArray(rows) ? rows : []
}

async function upsertCollegeUserRole(userId, roleId) {
  const rows = await listUserRolesForUser(userId)
  const existing = rows[0]
  if (existing) {
    return userFetch('/api/php/user-roles', {
      method: 'PATCH',
      query: { id: existing.user_role_id },
      body: { role_id: roleId },
    })
  }
  return userFetch('/api/php/user-roles', {
    method: 'POST',
    body: { user_id: Number(userId), role_id: Number(roleId) },
  })
}

async function deleteUserRolesForUser(userId) {
  const rows = await listUserRolesForUser(userId)
  for (const row of rows) {
    await userFetch('/api/php/user-roles', {
      method: 'DELETE',
      query: { id: row.user_role_id },
    })
  }
}

export function assignableRoleOptions(roles) {
  const active = (roles || []).filter((role) => Number(role.status) === 1)
  const preferred = [
    { keys: ['collegedean'], label: 'College Dean' },
    { keys: ['programchair'], label: 'Program Chair' },
    { keys: ['faculty'], label: 'Faculty' },
    { keys: ['student'], label: 'Student' },
  ]

  const options = []
  for (const entry of preferred) {
    const match = active.find((role) => entry.keys.includes(normalizeRoleKey(role.name)))
    if (match) {
      options.push({
        role_id: Number(match.role_id),
        name: match.name,
        label: entry.label,
      })
    }
  }
  return options
}

function mapRow(membership, user, roleNameById) {
  const roleName = membership.role_name || roleNameById[Number(membership.role_id)] || ''
  return {
    membershipId: Number(membership.membership_id),
    userId: Number(membership.user_id),
    name: displayName(user),
    firstName: user?.first_name || '',
    middleName: user?.middle_name || '',
    lastName: user?.last_name || '',
    suffix: user?.suffix || '',
    email: user?.email || '',
    role: roleLabel(roleName),
    roleName,
    roleId: Number(membership.role_id),
    departmentId: membership.department_id != null ? Number(membership.department_id) : null,
    department:
      membership.department_slug ||
      membership.department_name ||
      (membership.department_id == null ? '—' : '—'),
    departmentName: membership.department_name || '',
    status: Number(membership.status) === 1 ? 'active' : 'inactive',
    schoolId: Number(membership.school_id),
    createdAt: user?.created_at || membership.created_at || null,
  }
}

export async function loadCollegeUsers(schoolId) {
  const id = Number(schoolId)
  if (!id) {
    throw new Error('No school is linked to this account.')
  }

  const [membershipsRaw, usersRaw, departmentsRaw, rolesRaw] = await Promise.all([
    userFetch('/api/php/school-memberships', { query: { school_id: id } }),
    userFetch('/api/php/users'),
    userFetch('/api/php/departments', { query: { school_id: id } }),
    userFetch('/api/php/roles'),
  ])

  const users = Array.isArray(usersRaw) ? usersRaw : []
  const roles = Array.isArray(rolesRaw) ? rolesRaw : []
  const departments = (Array.isArray(departmentsRaw) ? departmentsRaw : []).filter(
    (dept) => dept?.status === undefined || Number(dept.status) === 1
  )

  const roleNameById = {}
  roles.forEach((role) => {
    roleNameById[Number(role.role_id)] = role.name
  })

  const userById = new Map(users.map((user) => [Number(user.user_id), user]))

  const usersList = (Array.isArray(membershipsRaw) ? membershipsRaw : [])
    .filter((row) => {
      const roleName = row.role_name || roleNameById[Number(row.role_id)] || ''
      return isSchoolPortalRole(roleName)
    })
    .map((row) => {
      const user = userById.get(Number(row.user_id))
      const mapped = mapRow(row, user, roleNameById)
      if (mapped.department === '—' && mapped.departmentId) {
        const dept = departments.find((item) => Number(item.department_id) === mapped.departmentId)
        if (dept) {
          mapped.department = dept.slug || dept.name || '—'
          mapped.departmentName = dept.name || ''
        }
      }
      return mapped
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    users: usersList,
    departments,
    roles,
    roleOptions: assignableRoleOptions(roles),
  }
}

export async function createCollegeUser({
  schoolId,
  firstName,
  middleName,
  lastName,
  suffix,
  email,
  roleName,
  departmentId,
}) {
  const id = Number(schoolId)
  if (!id) throw new Error('No school is linked to this account.')

  const roles = await userFetch('/api/php/roles')
  const roleId = findSchoolRoleId(roles, roleName)
  if (!roleId) throw new Error('Selected role is not configured.')

  const temporaryPassword = passwordFromPersonalInfo(firstName, lastName)
  const user = await userFetch('/api/php/users', {
    method: 'POST',
    body: {
      email,
      password: temporaryPassword,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      suffix: suffix || null,
      status: 1,
      send_welcome_email: true,
    },
  })

  try {
    const payload = {
      school_id: id,
      user_id: Number(user.user_id),
      role_id: roleId,
      status: 1,
    }
    if (departmentId != null && departmentId !== '') {
      payload.department_id = Number(departmentId)
    }

    const membership = await userFetch('/api/php/school-memberships', {
      method: 'POST',
      body: payload,
    })

    await userFetch('/api/php/user-roles', {
      method: 'POST',
      body: { user_id: Number(user.user_id), role_id: roleId },
    })

    return {
      user: {
        membershipId: Number(membership.membership_id),
        userId: Number(user.user_id),
        name: displayName(user),
        firstName: user.first_name || firstName,
        middleName: user.middle_name || middleName || '',
        lastName: user.last_name || lastName,
        suffix: user.suffix || suffix || '',
        email: user.email,
        role: roleLabel(roleName),
        roleName,
        roleId,
        departmentId: membership.department_id != null ? Number(membership.department_id) : null,
        department: membership.department_slug || membership.department_name || '—',
        status: 'active',
        schoolId: id,
        createdAt: user.created_at || membership.created_at || null,
      },
      temporaryPassword,
    }
  } catch (error) {
    try {
      await userFetch('/api/php/users', { method: 'DELETE', query: { id: user.user_id } })
    } catch {
      // best-effort cleanup
    }
    throw error
  }
}

export async function updateCollegeUser(
  row,
  { firstName, middleName, lastName, suffix, email, roleName, departmentId }
) {
  const roles = await userFetch('/api/php/roles')
  const roleId = findSchoolRoleId(roles, roleName)
  if (!roleId) throw new Error('Selected role is not configured.')

  await userFetch('/api/php/users', {
    method: 'PATCH',
    query: { id: row.userId },
    body: {
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      suffix: suffix || null,
      email,
    },
  })

  const membershipPayload = {
    role_id: roleId,
    department_id: departmentId != null && departmentId !== '' ? Number(departmentId) : null,
  }

  const membership = await userFetch('/api/php/school-memberships', {
    method: 'PATCH',
    query: { id: row.membershipId },
    body: membershipPayload,
  })

  await upsertCollegeUserRole(row.userId, roleId)

  const updatedUser = {
    first_name: firstName,
    middle_name: middleName || '',
    last_name: lastName,
    suffix: suffix || '',
    email,
  }

  return {
    ...row,
    name: displayName(updatedUser),
    firstName,
    middleName: middleName || '',
    lastName,
    suffix: suffix || '',
    email,
    role: roleLabel(roleName),
    roleName,
    roleId,
    departmentId: membership.department_id != null ? Number(membership.department_id) : null,
    department: membership.department_slug || membership.department_name || '—',
    createdAt: membership.created_at || row.createdAt || null,
  }
}

export async function setCollegeUserMembershipStatus(membershipId, status) {
  return userFetch('/api/php/school-memberships', {
    method: 'PATCH',
    query: { id: membershipId },
    body: { status: Number(status) },
  })
}

export async function removeCollegeUser(membershipId, userId) {
  await userFetch('/api/php/school-memberships', {
    method: 'DELETE',
    query: { id: membershipId },
  })

  const remaining = await userFetch('/api/php/school-memberships', {
    query: { user_id: userId },
  })

  if (!Array.isArray(remaining) || remaining.length === 0) {
    await deleteUserRolesForUser(userId)
    await userFetch('/api/php/users', {
      method: 'DELETE',
      query: { id: userId },
    })
  }
}
