import { listMemberships, createMembership, deleteMembership } from './memberships'
import {
  createUserRole,
  deleteUserRole,
  findRoleIdByName,
  listRoles,
  listUserRoles,
  normalizeRoleKey,
} from './roles'
import { listSchools } from './schools'
import { createUser, deleteUser, listUsers, patchUser } from './users'

function displayName(user) {
  const parts = [user.first_name, user.middle_name, user.last_name, user.suffix]
    .map((part) => (part || '').trim())
    .filter(Boolean)
  return parts.join(' ') || user.email
}

function splitName(fullName) {
  const trimmed = fullName.trim().replace(/\s+/g, ' ')
  const space = trimmed.indexOf(' ')
  if (space === -1) {
    return { firstName: trimmed, lastName: trimmed }
  }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  }
}

function generateTempPassword() {
  return `Tmp!${Math.random().toString(36).slice(2, 8)}A1`
}

function isSchoolAdminRole(roleName) {
  const key = normalizeRoleKey(roleName)
  return key === 'schooladmin' || key === 'collegeadmin'
}

function isSystemAdminRole(roleName) {
  return normalizeRoleKey(roleName) === 'systemadmin'
}

function uiRoleLabel(roleName) {
  if (isSystemAdminRole(roleName)) return 'System Admin'
  if (isSchoolAdminRole(roleName)) return 'College Admin'
  return roleName
}

export async function loadAdminsForAdmin() {
  const [users, userRoles, memberships, schools, roles] = await Promise.all([
    listUsers(),
    listUserRoles(),
    listMemberships(),
    listSchools(),
    listRoles(),
  ])

  const schoolNameById = {}
  ;(schools || []).forEach((school) => {
    schoolNameById[Number(school.school_id)] = school.name
  })

  const roleNameById = {}
  ;(roles || []).forEach((role) => {
    roleNameById[Number(role.role_id)] = role.name
  })

  const adminsByUserId = new Map()

  ;(userRoles || []).forEach((row) => {
    const roleName = row.role_name || roleNameById[Number(row.role_id)] || ''
    if (!isSystemAdminRole(roleName)) return
    const user = (users || []).find((item) => Number(item.user_id) === Number(row.user_id))
    if (!user) return
    adminsByUserId.set(Number(user.user_id), {
      id: Number(user.user_id),
      name: displayName(user),
      email: user.email,
      role: 'System Admin',
      school: '—',
      userRoleId: Number(row.user_role_id),
      membershipId: null,
      schoolId: null,
    })
  })

  ;(memberships || []).forEach((row) => {
    const roleName = row.role_name || roleNameById[Number(row.role_id)] || ''
    if (!isSchoolAdminRole(roleName)) return
    const userId = Number(row.user_id)
    if (adminsByUserId.has(userId) && isSystemAdminRole(adminsByUserId.get(userId).role)) {
      return
    }
    const user = (users || []).find((item) => Number(item.user_id) === userId)
    if (!user) return
    adminsByUserId.set(userId, {
      id: userId,
      name: displayName(user),
      email: user.email,
      role: 'College Admin',
      school: schoolNameById[Number(row.school_id)] || '—',
      userRoleId: null,
      membershipId: Number(row.membership_id),
      schoolId: Number(row.school_id),
    })
  })

  return {
    admins: Array.from(adminsByUserId.values()),
    schools: schools || [],
    roles: roles || [],
  }
}

export async function createAdminAccount({ name, email, role, school }) {
  const roles = await listRoles()
  const schools = await listSchools()
  const { firstName, lastName } = splitName(name)
  const tempPassword = generateTempPassword()

  const user = await createUser({
    email,
    password: tempPassword,
    first_name: firstName,
    last_name: lastName,
    status: 1,
  })

  try {
    if (isSystemAdminRole(role)) {
      const roleId = findRoleIdByName(roles, 'SystemAdmin')
      if (!roleId) throw new Error('SystemAdmin role is not configured.')
      await createUserRole({ user_id: user.user_id, role_id: roleId })
      return {
        admin: {
          id: Number(user.user_id),
          name: displayName(user),
          email: user.email,
          role: 'System Admin',
          school: '—',
        },
        temporaryPassword: tempPassword,
      }
    }

    if (!isSchoolAdminRole(role) && normalizeRoleKey(role) !== 'collegeadmin') {
      throw new Error('Role must be System Admin or College Admin.')
    }

    const roleId = findRoleIdByName(roles, 'SchoolAdmin')
    if (!roleId) throw new Error('SchoolAdmin role is not configured.')

    const matchedSchool = (schools || []).find(
      (item) => String(item.name).toLowerCase() === String(school).trim().toLowerCase()
    )
    if (!matchedSchool) {
      throw new Error('Assigned school was not found. Use an exact school name.')
    }

    await createMembership({
      school_id: matchedSchool.school_id,
      user_id: user.user_id,
      role_id: roleId,
      status: 1,
    })

    return {
      admin: {
        id: Number(user.user_id),
        name: displayName(user),
        email: user.email,
        role: 'College Admin',
        school: matchedSchool.name,
      },
      temporaryPassword: tempPassword,
    }
  } catch (error) {
    try {
      await deleteUser(user.user_id)
    } catch {
      // best-effort cleanup
    }
    throw error
  }
}

export async function updateAdminAccount(admin, { name, role, school }) {
  const { firstName, lastName } = splitName(name)
  const roles = await listRoles()
  const schools = await listSchools()
  const userRoles = await listUserRoles({ user_id: admin.id })
  const memberships = await listMemberships({ user_id: admin.id })

  await patchUser(admin.id, {
    first_name: firstName,
    last_name: lastName,
  })

  const systemRoleId = findRoleIdByName(roles, 'SystemAdmin')
  const schoolRoleId = findRoleIdByName(roles, 'SchoolAdmin')

  for (const row of userRoles || []) {
    const roleName = row.role_name || ''
    if (isSystemAdminRole(roleName)) {
      await deleteUserRole(row.user_role_id)
    }
  }

  for (const row of memberships || []) {
    const roleName = row.role_name || ''
    if (isSchoolAdminRole(roleName)) {
      await deleteMembership(row.membership_id)
    }
  }

  if (isSystemAdminRole(role)) {
    if (!systemRoleId) throw new Error('SystemAdmin role is not configured.')
    await createUserRole({ user_id: admin.id, role_id: systemRoleId })
    return {
      id: admin.id,
      name,
      email: admin.email,
      role: 'System Admin',
      school: '—',
    }
  }

  if (!schoolRoleId) throw new Error('SchoolAdmin role is not configured.')
  const matchedSchool = (schools || []).find(
    (item) => String(item.name).toLowerCase() === String(school).trim().toLowerCase()
  )
  if (!matchedSchool) {
    throw new Error('Assigned school was not found. Use an exact school name.')
  }

  await createMembership({
    school_id: matchedSchool.school_id,
    user_id: admin.id,
    role_id: schoolRoleId,
    status: 1,
  })

  return {
    id: admin.id,
    name,
    email: admin.email,
    role: 'College Admin',
    school: matchedSchool.name,
  }
}

export async function removeAdminAccount(adminId) {
  const [userRoles, memberships] = await Promise.all([
    listUserRoles({ user_id: adminId }),
    listMemberships({ user_id: adminId }),
  ])

  for (const row of userRoles || []) {
    await deleteUserRole(row.user_role_id)
  }
  for (const row of memberships || []) {
    await deleteMembership(row.membership_id)
  }
  await deleteUser(adminId)
}
