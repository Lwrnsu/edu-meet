import { userFetch } from './http'

function normalizeRole(roleName) {
  return String(roleName || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function isActive(row) {
  return Number(row?.status) === 1
}

/**
 * Load dashboard overview for a college admin's school.
 * @param {number|string} schoolId
 */
export async function loadCollegeAdminOverview(schoolId) {
  const id = Number(schoolId)
  if (!id) {
    throw new Error('No school is linked to this account.')
  }

  const [departmentsRaw, membershipsRaw] = await Promise.all([
    userFetch('/api/php/departments', { query: { school_id: id } }),
    userFetch('/api/php/school-memberships', { query: { school_id: id } }),
  ])

  const departments = (Array.isArray(departmentsRaw) ? departmentsRaw : []).filter(
    (dept) => dept?.status === undefined || Number(dept.status) === 1
  )
  const memberships = (Array.isArray(membershipsRaw) ? membershipsRaw : []).filter(isActive)

  let totalStudents = 0
  let totalFaculty = 0
  const studentsByDept = new Map()

  for (const row of memberships) {
    const role = normalizeRole(row.role_name)
    if (role === 'student') {
      totalStudents += 1
      const deptId = Number(row.department_id) || 0
      if (deptId > 0) {
        studentsByDept.set(deptId, (studentsByDept.get(deptId) || 0) + 1)
      }
    } else if (role === 'faculty') {
      totalFaculty += 1
    }
  }

  const departmentOverview = departments.map((dept) => {
    const deptId = Number(dept.department_id)
    return {
      id: deptId,
      name: dept.name || '',
      slug: dept.slug || dept.name || `Dept ${deptId}`,
      studentCount: studentsByDept.get(deptId) || 0,
    }
  })

  return {
    totalStudents,
    totalFaculty,
    departmentCount: departments.length,
    departments: departmentOverview,
  }
}
