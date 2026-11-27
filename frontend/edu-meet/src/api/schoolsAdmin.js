import { listDepartments } from './departments'
import { deleteMembership, listMemberships, patchMembership } from './memberships'
import {
  createSchool,
  deleteSchool,
  listSchools,
  mapSchoolFromApi,
  patchSchool,
} from './schools'
import { deleteUser, patchUser } from './users'

export async function loadSchoolsForAdmin() {
  const [schools, memberships, departments] = await Promise.all([
    listSchools(),
    listMemberships(),
    listDepartments(),
  ])

  const memberCounts = {}
  ;(memberships || []).forEach((row) => {
    const schoolId = Number(row.school_id)
    memberCounts[schoolId] = (memberCounts[schoolId] || 0) + 1
  })

  const departmentCounts = {}
  ;(departments || []).forEach((row) => {
    const schoolId = Number(row.school_id)
    departmentCounts[schoolId] = (departmentCounts[schoolId] || 0) + 1
  })

  return (schools || []).map((school) =>
    mapSchoolFromApi(school, {
      totalUsers: memberCounts[Number(school.school_id)] || 0,
      departments: departmentCounts[Number(school.school_id)] || 0,
    })
  )
}

export async function createApprovedSchool({ name, address, email }) {
  const created = await createSchool({
    name,
    location: address,
    email,
    status: 1,
  })
  return mapSchoolFromApi(created, { totalUsers: 0, departments: 0 })
}

export async function updateSchoolDetails(id, { name, address }) {
  const updated = await patchSchool(id, {
    name,
    location: address,
  })
  return updated
}

export async function approveSchoolRequest(schoolId) {
  const memberships = (await listMemberships({ school_id: schoolId })) || []
  await patchSchool(schoolId, { status: 1 })

  await Promise.all(
    memberships.map(async (membership) => {
      await patchMembership(membership.membership_id, { status: 1 })
      await patchUser(membership.user_id, { status: 1 })
    })
  )
}

export async function rejectSchoolRequest(schoolId) {
  const memberships = (await listMemberships({ school_id: schoolId })) || []

  for (const membership of memberships) {
    await deleteMembership(membership.membership_id)
    if (Number(membership.status) === 0) {
      try {
        await deleteUser(membership.user_id)
      } catch {
        // Keep active users if soft-delete fails or user is shared.
      }
    }
  }

  await deleteSchool(schoolId)
}

export async function removeSchool(schoolId) {
  const memberships = (await listMemberships({ school_id: schoolId })) || []
  for (const membership of memberships) {
    await deleteMembership(membership.membership_id)
  }
  await deleteSchool(schoolId)
}
