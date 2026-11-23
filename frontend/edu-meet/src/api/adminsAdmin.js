import { listMemberships, createMembership, deleteMembership } from './memberships'
import {
  createUserRole,
  deleteUserRole,
  findRoleIdByName,
  listRoles,
  listUserRoles,
  normalizeRoleKey,
  updateUserRole,
} from './roles'
import { listSchools } from './schools'
import { passwordFromPersonalInfo } from './generatedPassword'
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

function isAdminRoleName(roleName) {
  return isSystemAdminRole(roleName) || isSchoolAdminRole(roleName)
}

function adminRoleId(roles, role) {
  if (isSystemAdminRole(role)) {
    const roleId = findRoleIdByName(roles, 'SystemAdmin')
    if (!roleId) throw new Error('SystemAdmin role is not configured.')
    return roleId
  }

  if (!isSchoolAdminRole(role)) {
    throw new Error('Role must be System Admin or College Admin.')
  }

  const roleId = findRoleIdByName(roles, 'SchoolAdmin') || findRoleIdByName(roles, 'CollegeAdmin')
  if (!roleId) throw new Error('SchoolAdmin role is not configured.')
  return roleId
}

async function upsertAdminUserRole(userId, roleId, existingRows) {
  const rows = existingRows || []
  const match = rows.find((row) => Number(row.role_id) === Number(roleId))
  const adminRows = rows.filter((row) => isAdminRoleName(row.role_name))

  if (match) {
    for (const row of adminRows) {
      if (Number(row.user_role_id) !== Number(match.user_role_id)) {
        await deleteUserRole(row.user_role_id)
      }
    }
    return match
  }

  const adminRow = adminRows[0]
  if (adminRow) {
    const updated = await updateUserRole(adminRow.user_role_id, { role_id: roleId })
    for (const row of adminRows) {
      if (Number(row.user_role_id) !== Number(adminRow.user_role_id)) {
        await deleteUserRole(row.user_role_id)
      }
    }
    return updated
  }

  return createUserRole({ user_id: userId, role_id: roleId })
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
    const systemAdmin = isSystemAdminRole(roleName)
    const collegeAdmin = isSchoolAdminRole(roleName)
    if (!systemAdmin && !collegeAdmin) return
    const user = (users || []).find((item) => Number(item.user_id) === Number(row.user_id))
    if (!user) return
    const userId = Number(user.user_id)
    if (!systemAdmin && adminsByUserId.has(userId) && isSystemAdminRole(adminsByUserId.get(userId).role)) {
      return
    }
    const membership = collegeAdmin
      ? (memberships || []).find((item) => {
          const membershipRole = item.role_name || roleNameById[Number(item.role_id)] || ''
          return Number(item.user_id) === userId && isSchoolAdminRole(membershipRole)
        })
      : null
    adminsByUserId.set(userId, {
      id: userId,
      name: displayName(user),
      email: user.email,
      role: systemAdmin ? 'System Admin' : 'College Admin',
      school: systemAdmin ? '—' : schoolNameById[Number(membership?.school_id)] || '—',
      userRoleId: Number(row.user_role_id),
      membershipId: membership ? Number(membership.membership_id) : null,
      schoolId: membership ? Number(membership.school_id) : null,
    })
  })

  ;(memberships || []).forEach((row) => {
    const roleName = row.role_name || roleNameById[Number(row.role_id)] || ''
    if (!isSchoolAdminRole(roleName)) return
    const userId = Number(row.user_id)
    if (adminsByUserId.has(userId)) return
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

export async function createAdminAccount({ firstName, lastName, email, role, school }) {
  const roles = await listRoles()
  const schools = await listSchools()
  const givenName = String(firstName || '').trim()
  const surname = String(lastName || '').trim()
  const tempPassword = isSchoolAdminRole(role)
    ? passwordFromPersonalInfo(givenName, surname)
    : generateTempPassword()

  const user = await createUser({
    email,
    password: tempPassword,
    first_name: givenName,
    last_name: surname,
    status: 1,
  })

  try {
    const roleId = adminRoleId(roles, role)

    if (isSystemAdminRole(role)) {
      await upsertAdminUserRole(user.user_id, roleId, [])
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

    const matchedSchool = (schools || []).find(
      (item) => String(item.name).toLowerCase() === String(school).trim().toLowerCase()
    )
    if (!matchedSchool) {
      throw new Error('Assigned school was not found. Use an exact school name.')
    }

    await upsertAdminUserRole(user.user_id, roleId, [])
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
  const roleId = adminRoleId(roles, role)
  const matchedSchool = isSystemAdminRole(role)
    ? null
    : (schools || []).find(
        (item) => String(item.name).toLowerCase() === String(school).trim().toLowerCase()
      )
  if (!isSystemAdminRole(role) && !matchedSchool) {
    throw new Error('Assigned school was not found. Use an exact school name.')
  }

  await patchUser(admin.id, {
    first_name: firstName,
    last_name: lastName,
  })
  await upsertAdminUserRole(admin.id, roleId, userRoles)

  for (const row of memberships || []) {
    const roleName = row.role_name || ''
    if (isSchoolAdminRole(roleName)) {
      await deleteMembership(row.membership_id)
    }
  }

  if (isSystemAdminRole(role)) {
    return {
      id: admin.id,
      name,
      email: admin.email,
      role: 'System Admin',
      school: '—',
    }
  }

  await createMembership({
    school_id: matchedSchool.school_id,
    user_id: admin.id,
    role_id: roleId,
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
