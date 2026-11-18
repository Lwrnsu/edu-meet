import { useEffect, useMemo, useState } from 'react'

const INITIAL_ADMINS = [
  {
    id: 1,
    name: 'Charles Cerico',
    email: 'cericothegoat@gmail.com',
    role: 'College Admin',
    school: 'Gordon College',
  },
  {
    id: 2,
    name: 'France Pulgan',
    email: 'pulganthegoat@gmail.com',
    role: 'College Admin',
    school: 'Columban College',
  },
  {
    id: 3,
    name: 'Lorenz Cerico',
    email: 'lorenzcerico@gmail.com',
    role: 'System Admin',
    school: '—',
  },
]

const EMPTY_FORM = {
  name: '',
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

export default function ManageAdminsSection() {
  const [admins, setAdmins] = useState(INITIAL_ADMINS)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editAdmin, setEditAdmin] = useState(null)
  const [deleteAdmin, setDeleteAdmin] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')

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
    setEditForm({
      name: admin.name || '',
      role: admin.role || '',
      school: admin.school === '—' ? '' : admin.school || '',
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
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
      if (error) setError('')
    }
  }

  function updateEditField(field) {
    return (event) => {
      setEditForm((prev) => ({ ...prev, [field]: event.target.value }))
      if (editError) setEditError('')
    }
  }

  function handleCreate(event) {
    event.preventDefault()

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    const role = form.role.trim()
    let school = form.school.trim()

    if (!name || !email || !role) {
      setError('Admin name, email, and role are required.')
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

    setAdmins((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        email,
        role,
        school,
      },
    ])
    closeModal()
  }

  function handleEditSave(event) {
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

    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === editAdmin.id
          ? { ...admin, name, role, school }
          : admin
      )
    )
    closeEditModal()
  }

  function handleConfirmDelete() {
    if (!deleteAdmin) return
    setAdmins((prev) => prev.filter((admin) => admin.id !== deleteAdmin.id))
    closeDeleteModal()
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
                value={form.name}
                onChange={updateField('name')}
                placeholder="Admin Name"
                aria-label="Admin Name"
                autoFocus
              />
              <input
                className="admin-schools-modal__input"
                type="email"
                value={form.email}
                onChange={updateField('email')}
                placeholder="Email"
                aria-label="Email"
              />
              <input
                className="admin-schools-modal__input"
                type="text"
                value={form.role}
                onChange={updateField('role')}
                placeholder="Role"
                aria-label="Role"
              />
              <input
                className="admin-schools-modal__input"
                type="text"
                value={form.school}
                onChange={updateField('school')}
                placeholder="Assigned School"
                aria-label="Assigned School"
              />

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
              <input
                className="admin-schools-modal__input"
                type="text"
                value={editForm.role}
                onChange={updateEditField('role')}
                placeholder="Role"
                aria-label="Role"
              />
              <input
                className="admin-schools-modal__input"
                type="text"
                value={editForm.school}
                onChange={updateEditField('school')}
                placeholder="Assigned School"
                aria-label="Assigned School"
              />

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
