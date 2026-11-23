import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAdminAccount,
  loadAdminsForAdmin,
  removeAdminAccount,
  updateAdminAccount,
} from '../api/adminsAdmin'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  school: '',
}

const EMPTY_EDIT_FORM = {
  name: '',
  role: '',
  school: '',
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 18c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M14.2 18c.4-1.7 1.6-2.9 3.4-3.3" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M12.5 7.5l4 4" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
    </svg>
  )
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isCollegeAdmin(role) {
  return String(role).toLowerCase().replace(/[\s_-]+/g, '') === 'collegeadmin'
}

function isSystemAdmin(role) {
  return String(role).toLowerCase().replace(/[\s_-]+/g, '') === 'systemadmin'
}

function roleKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function dbRoleNameForLabel(label, roles) {
  const active = (roles || []).filter((role) => Number(role.status) === 1)
  if (isSystemAdmin(label)) {
    return active.find((role) => isSystemAdmin(role.name))?.name || ''
  }
  if (isCollegeAdmin(label) || roleKey(label) === 'schooladmin') {
    return (
      active.find((role) => roleKey(role.name) === 'schooladmin')?.name ||
      active.find((role) => isCollegeAdmin(role.name))?.name ||
      ''
    )
  }
  return active.find((role) => role.name === label)?.name || ''
}

function adminRoleOptions(roles) {
  const active = (roles || []).filter((role) => Number(role.status) === 1)
  const system = active.find((role) => isSystemAdmin(role.name))
  const college =
    active.find((role) => roleKey(role.name) === 'schooladmin') ||
    active.find((role) => isCollegeAdmin(role.name))

  return [
    system ? { ...system, label: 'SystemAdmin' } : null,
    college ? { ...college, label: 'CollegeAdmin' } : null,
  ].filter(Boolean)
}

function schoolChoices(schools, currentSchool) {
  const approved = (schools || []).filter((school) => Number(school.status) === 1)
  const current = String(currentSchool || '').trim()
  if (current && current !== '—' && !approved.some((school) => school.name === current)) {
    return [...approved, { school_id: `current-${current}`, name: current }]
  }
  return approved
}

export default function ManageAdminsSection() {
  const [admins, setAdmins] = useState([])
  const [schools, setSchools] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editAdmin, setEditAdmin] = useState(null)
  const [deleteAdmin, setDeleteAdmin] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')

  const refreshAdmins = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const data = await loadAdminsForAdmin()
      setAdmins(data.admins)
      setSchools(data.schools || [])
      setRoles(data.roles || [])
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load admins.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAdmins()
  }, [refreshAdmins])

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return admins
    return admins.filter((admin) => admin.name.toLowerCase().includes(q))
  }, [admins, query])

  const total = admins.length
  const collegeAdmins = admins.filter((admin) => isCollegeAdmin(admin.role)).length
  const systemAdmins = admins.filter((admin) => isSystemAdmin(admin.role)).length

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setError('')
  }

  function closeEditModal() {
    setEditAdmin(null)
    setEditForm(EMPTY_EDIT_FORM)
    setEditError('')
  }

  function closeDeleteModal() {
    setDeleteAdmin(null)
  }

  function openModal() {
    setEditAdmin(null)
    setDeleteAdmin(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(admin) {
    setModalOpen(false)
    setDeleteAdmin(null)
    setEditError('')
    const school = admin.school === '—' ? '' : admin.school || ''
    setEditForm({
      name: admin.name || '',
      role: dbRoleNameForLabel(admin.role, roles),
      school: isSystemAdmin(admin.role) ? '' : school,
    })
    setEditAdmin(admin)
  }

  function openDeleteModal(admin) {
    setModalOpen(false)
    setEditAdmin(null)
    setDeleteAdmin(admin)
  }

  function updateField(field) {
    return (event) => {
      const value = event.target.value
      setForm((prev) => {
        const next = { ...prev, [field]: value }
        if (field === 'role' && isSystemAdmin(value)) next.school = ''
        return next
      })
      if (error) setError('')
    }
  }

  function updateEditField(field) {
    return (event) => {
      const value = event.target.value
      setEditForm((prev) => {
        const next = { ...prev, [field]: value }
        if (field === 'role' && isSystemAdmin(value)) next.school = ''
        return next
      })
      if (editError) setEditError('')
    }
  }

  async function handleCreate(event) {
    event.preventDefault()

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim().toLowerCase()
    const role = form.role.trim()
    let school = form.school.trim()

    if (!firstName || !lastName || !email || !role) {
      setError('First name, surname, email, and role are required.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email.')
      return
    }
    if (!school) {
      if (isSystemAdmin(role)) {
        school = '—'
      } else {
        setError('Assigned school is required.')
        return
      }
    }

    setBusy(true)
    setError('')
    setInfo('')
    try {
      const result = await createAdminAccount({ firstName, lastName, email, role, school })
      setAdmins((prev) => [...prev, result.admin])
      setInfo(`Admin created. Temporary password: ${result.temporaryPassword}`)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditSave(event) {
    event.preventDefault()

    if (!editAdmin) return

    const name = editForm.name.trim()
    const role = editForm.role.trim()
    let school = editForm.school.trim()

    if (!name || !role) {
      setEditError('Admin name and role are required.')
      return
    }
    if (!school) {
      if (isSystemAdmin(role)) {
        school = '—'
      } else {
        setEditError('Assigned school is required.')
        return
      }
    }

    setBusy(true)
    setEditError('')
    try {
      const updated = await updateAdminAccount(editAdmin, { name, role, school })
      setAdmins((prev) =>
        prev.map((admin) => (admin.id === editAdmin.id ? { ...admin, ...updated } : admin))
      )
      closeEditModal()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update admin.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteAdmin) return
    setBusy(true)
    try {
      await removeAdminAccount(deleteAdmin.id)
      setAdmins((prev) => prev.filter((admin) => admin.id !== deleteAdmin.id))
      closeDeleteModal()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to delete admin.')
      closeDeleteModal()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!modalOpen && !editAdmin && !deleteAdmin) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        if (deleteAdmin) closeDeleteModal()
        else if (editAdmin) closeEditModal()
        else closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, editAdmin, deleteAdmin])

  return (
    <section className="admin-admins" aria-label="Admin management">
      <div className="admin-admins__intro">
        <h2 className="admin-admins__title">Admin Management</h2>
        <p className="admin-admins__subtitle">
          Manage and monitor administrator accounts across registered schools
        </p>
        {listError ? (
          <p className="admin-dash__api-error" role="alert">
            {listError}
          </p>
        ) : null}
        {info ? (
          <p className="admin-dash__api-status" role="status">
            {info}
          </p>
        ) : null}
        {loading ? <p className="admin-dash__api-status">Loading admins…</p> : null}
      </div>

      <div className="admin-admins__stats" aria-label="Admin stats">
        <article className="admin-admins__stat admin-admins__stat--total">
          <span className="admin-admins__stat-icon">
            <IconUsers />
          </span>
          <p className="admin-admins__stat-value">{total}</p>
          <p className="admin-admins__stat-label">Total Admins</p>
        </article>

        <article className="admin-admins__stat admin-admins__stat--college">
          <span className="admin-admins__stat-icon">
            <IconUsers />
          </span>
          <p className="admin-admins__stat-value">{collegeAdmins}</p>
          <p className="admin-admins__stat-label">Total College Admins</p>
        </article>

        <article className="admin-admins__stat admin-admins__stat--system">
          <span className="admin-admins__stat-icon">
            <IconUsers />
          </span>
          <p className="admin-admins__stat-value">{systemAdmins}</p>
          <p className="admin-admins__stat-label">Total System Admins</p>
        </article>
      </div>

      <div className="admin-admins__toolbar">
        <label className="admin-admins__search">
          <IconSearch />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search admin name..."
            aria-label="Search admin name"
          />
        </label>

        <button type="button" className="admin-admins__add" onClick={openModal}>
          <IconPlus />
          Add Admin
        </button>
      </div>

      <div className="admin-admins__table-wrap">
        <div className="admin-admins__table-head" role="row">
          <span>Admin</span>
          <span>Email</span>
          <span>Role</span>
          <span>Assigned School</span>
          <span>Action</span>
        </div>

        <ul className="admin-admins__table-body">
          {filteredAdmins.map((admin) => (
            <li key={admin.id} className="admin-admins__row">
              <span className="admin-admins__cell">{admin.name}</span>
              <span className="admin-admins__cell">{admin.email}</span>
              <span className="admin-admins__cell">{admin.role}</span>
              <span className="admin-admins__cell">{admin.school}</span>
              <span className="admin-admins__actions">
                <button
                  type="button"
                  className="admin-admins__icon-btn"
                  aria-label={`Edit ${admin.name}`}
                  onClick={() => openEditModal(admin)}
                >
                  <IconEdit />
                </button>
                <button
                  type="button"
                  className="admin-admins__icon-btn"
                  aria-label={`Delete ${admin.name}`}
                  onClick={() => openDeleteModal(admin)}
                >
                  <IconTrash />
                </button>
              </span>
            </li>
          ))}

          {filteredAdmins.length === 0 ? (
            <li className="admin-admins__empty-row">No admins match your search.</li>
          ) : null}
        </ul>
      </div>

      {modalOpen ? (
        <div
          className="admin-schools-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            className="admin-schools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-admin-title"
          >
            <h3 id="add-admin-title" className="admin-schools-modal__title">
              Add New Admin
            </h3>

            <form className="admin-schools-modal__form" onSubmit={handleCreate}>
              <input
                className="admin-schools-modal__input"
                type="text"
                value={form.firstName}
                onChange={updateField('firstName')}
                placeholder="First Name"
                aria-label="First Name"
                autoFocus
              />
              <input
                className="admin-schools-modal__input"
                type="text"
                value={form.lastName}
                onChange={updateField('lastName')}
                placeholder="Surname"
                aria-label="Surname"
              />
              <input
                className="admin-schools-modal__input"
                type="email"
                value={form.email}
                onChange={updateField('email')}
                placeholder="Email"
                aria-label="Email"
              />
              <select
                className="admin-schools-modal__input"
                value={form.role}
                onChange={updateField('role')}
                aria-label="Role"
              >
                <option value="">Select role</option>
                {adminRoleOptions(roles).map((role) => (
                  <option key={role.role_id} value={role.name}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select
                className="admin-schools-modal__input"
                value={form.school}
                onChange={updateField('school')}
                aria-label="Assigned School"
                disabled={isSystemAdmin(form.role)}
              >
                <option value="">Select school</option>
                {schoolChoices(schools, form.school).map((school) => (
                  <option key={school.school_id} value={school.name}>
                    {school.name}
                  </option>
                ))}
              </select>

              {error ? <p className="admin-schools-modal__error">{error}</p> : null}

              <div className="admin-schools-modal__divider" />

              <div className="admin-schools-modal__actions">
                <button type="submit" className="admin-schools-modal__btn">
                  Create Admin
                </button>
                <button type="button" className="admin-schools-modal__btn" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editAdmin ? (
        <div
          className="admin-schools-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeEditModal()
          }}
        >
          <div
            className="admin-schools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-admin-title"
          >
            <h3 id="edit-admin-title" className="admin-schools-modal__title">
              Edit Admin Information
            </h3>

            <form className="admin-schools-modal__form" onSubmit={handleEditSave}>
              <input
                className="admin-schools-modal__input"
                type="text"
                value={editForm.name}
                onChange={updateEditField('name')}
                placeholder="Admin Name"
                aria-label="Admin Name"
                autoFocus
              />
              <select
                className="admin-schools-modal__input"
                value={editForm.role}
                onChange={updateEditField('role')}
                aria-label="Role"
              >
                <option value="">Select role</option>
                {adminRoleOptions(roles).map((role) => (
                  <option key={role.role_id} value={role.name}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select
                className="admin-schools-modal__input"
                value={editForm.school}
                onChange={updateEditField('school')}
                aria-label="Assigned School"
                disabled={isSystemAdmin(editForm.role)}
              >
                <option value="">Select school</option>
                {schoolChoices(schools, editForm.school).map((school) => (
                  <option key={school.school_id} value={school.name}>
                    {school.name}
                  </option>
                ))}
              </select>

              {editError ? <p className="admin-schools-modal__error">{editError}</p> : null}

              <div className="admin-schools-modal__divider" />

              <div className="admin-schools-modal__actions">
                <button type="submit" className="admin-schools-modal__btn">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="admin-schools-modal__btn admin-schools-modal__btn--secondary"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteAdmin ? (
        <div
          className="admin-schools-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal()
          }}
        >
          <div
            className="admin-schools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-admin-title"
          >
            <h3 id="delete-admin-title" className="admin-schools-modal__title">
              Delete Admin
            </h3>

            <div className="admin-schools-modal__divider" />
            <div className="admin-schools-modal__spacer" aria-hidden="true" />

            <div className="admin-schools-modal__actions">
              <button
                type="button"
                className="admin-schools-modal__btn admin-schools-modal__btn--reject"
                onClick={handleConfirmDelete}
              >
                Confirm
              </button>
              <button
                type="button"
                className="admin-schools-modal__btn admin-schools-modal__btn--secondary"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
