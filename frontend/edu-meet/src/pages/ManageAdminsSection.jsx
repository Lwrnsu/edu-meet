import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createAdminAccount,
  loadAdminsForAdmin,
  removeAdminAccount,
  updateAdminAccount,
} from '../api/adminsAdmin'
import { isLettersOnlyName } from '../api/nameValidation'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  email: '',
  role: '',
  school: '',
}

const EMPTY_EDIT_FORM = {
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  school: '',
}

const ROLE_FILTER_OPTIONS = [
  { key: '', label: 'All roles' },
  { key: 'systemadmin', label: 'System Admin' },
  { key: 'collegeadmin', label: 'College Admin' },
]

const SORT_OPTIONS = [
  { key: 'az', label: 'A-Z' },
  { key: 'latest', label: 'Latest to Oldest Added' },
  { key: 'oldest', label: 'Oldest to Latest Added' },
]

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

function IconCaret() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M6 9l6 6 6-6H6z" />
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

function adminRoleOptions(roles, { includeSystemAdmin = true } = {}) {
  const active = (roles || []).filter((role) => Number(role.status) === 1)
  const system = includeSystemAdmin ? active.find((role) => isSystemAdmin(role.name)) : null
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

function createdSortValue(admin) {
  const parsed = Date.parse(admin.createdAt || '')
  if (Number.isFinite(parsed)) return parsed
  return Number(admin.id) || 0
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
  const [roleFilter, setRoleFilter] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortMode, setSortMode] = useState('az')
  const [openHeaderMenu, setOpenHeaderMenu] = useState(null)
  const [headerMenuPos, setHeaderMenuPos] = useState({ top: 0, left: 0, minWidth: 168 })
  const nameFilterRef = useRef(null)
  const nameButtonRef = useRef(null)
  const roleFilterRef = useRef(null)
  const roleButtonRef = useRef(null)
  const schoolFilterRef = useRef(null)
  const schoolButtonRef = useRef(null)
  const headerMenuRef = useRef(null)
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

  const updateHeaderMenuPosition = useCallback(() => {
    const button =
      openHeaderMenu === 'name'
        ? nameButtonRef.current
        : openHeaderMenu === 'role'
          ? roleButtonRef.current
          : openHeaderMenu === 'school'
            ? schoolButtonRef.current
            : null
    if (!button) return
    const rect = button.getBoundingClientRect()
    setHeaderMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, openHeaderMenu === 'role' ? 168 : 200),
    })
  }, [openHeaderMenu])

  useLayoutEffect(() => {
    if (!openHeaderMenu) return undefined
    updateHeaderMenuPosition()

    function handleReposition() {
      updateHeaderMenuPosition()
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [openHeaderMenu, updateHeaderMenuPosition])

  useEffect(() => {
    if (!openHeaderMenu) return undefined

    function handlePointerDown(event) {
      const target = event.target
      const inName = nameFilterRef.current?.contains(target)
      const inRole = roleFilterRef.current?.contains(target)
      const inSchool = schoolFilterRef.current?.contains(target)
      const inMenu = headerMenuRef.current?.contains(target)
      if (!inName && !inRole && !inSchool && !inMenu) {
        setOpenHeaderMenu(null)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenHeaderMenu(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openHeaderMenu])

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = admins

    if (q) {
      list = list.filter((admin) => admin.name.toLowerCase().includes(q))
    }

    if (roleFilter === 'systemadmin') {
      list = list.filter((admin) => isSystemAdmin(admin.role))
    } else if (roleFilter === 'collegeadmin') {
      list = list.filter((admin) => isCollegeAdmin(admin.role))
    }

    if (sortKey && sortMode === 'az') {
      list = [...list].sort((a, b) => {
        const valueFor = (admin) => {
          if (sortKey === 'school') {
            const school = String(admin.school || '').trim()
            return school === '—' ? '' : school
          }
          return String(admin.name || '')
        }
        return valueFor(a).toLowerCase().localeCompare(valueFor(b).toLowerCase())
      })
    } else if (sortKey && sortMode === 'latest') {
      list = [...list].sort((a, b) => createdSortValue(b) - createdSortValue(a))
    } else if (sortKey && sortMode === 'oldest') {
      list = [...list].sort((a, b) => createdSortValue(a) - createdSortValue(b))
    }

    return list
  }, [admins, query, roleFilter, sortKey, sortMode])

  function toggleHeaderMenu(key) {
    setOpenHeaderMenu((prev) => (prev === key ? null : key))
  }

  function selectSort(key, mode) {
    setSortKey(key)
    setSortMode(mode)
    setOpenHeaderMenu(null)
  }

  function selectRoleFilter(key) {
    setRoleFilter(key)
    setOpenHeaderMenu(null)
  }

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
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      middleName: admin.middleName || '',
      suffix: admin.suffix || '',
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
      setEditForm((prev) => ({ ...prev, [field]: value }))
      if (editError) setEditError('')
    }
  }

  async function handleCreate(event) {
    event.preventDefault()

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const middleName = form.middleName.trim()
    const suffix = form.suffix.trim()
    const email = form.email.trim().toLowerCase()
    const role = form.role.trim()
    const school = form.school.trim()

    if (!firstName || !lastName || !email || !role) {
      setError('First name, last name, email, and role are required.')
      return
    }
    if (!isLettersOnlyName(firstName)) {
      setError('First name must contain letters only.')
      return
    }
    if (!isLettersOnlyName(lastName)) {
      setError('Last name must contain letters only.')
      return
    }
    if (middleName && !isLettersOnlyName(middleName)) {
      setError('Middle name must contain letters only.')
      return
    }
    if (suffix && !isLettersOnlyName(suffix)) {
      setError('Suffix must contain letters only.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email.')
      return
    }
    if (!school) {
      setError('Assigned school is required.')
      return
    }

    setBusy(true)
    setError('')
    setInfo('')
    try {
      const result = await createAdminAccount({
        firstName,
        lastName,
        middleName,
        suffix,
        email,
        role,
        school,
      })
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

    const firstName = editForm.firstName.trim()
    const lastName = editForm.lastName.trim()
    const middleName = editForm.middleName.trim()
    const suffix = editForm.suffix.trim()
    const role = dbRoleNameForLabel(editAdmin.role, roles)
    let school = editForm.school.trim()

    if (!firstName || !lastName) {
      setEditError('First name and last name are required.')
      return
    }
    if (!role) {
      setEditError('Could not resolve this admin role.')
      return
    }
    if (!isLettersOnlyName(firstName)) {
      setEditError('First name must contain letters only.')
      return
    }
    if (!isLettersOnlyName(lastName)) {
      setEditError('Last name must contain letters only.')
      return
    }
    if (middleName && !isLettersOnlyName(middleName)) {
      setEditError('Middle name must contain letters only.')
      return
    }
    if (suffix && !isLettersOnlyName(suffix)) {
      setEditError('Suffix must contain letters only.')
      return
    }
    if (!school) {
      if (isSystemAdmin(editAdmin.role)) {
        school = '—'
      } else {
        setEditError('Assigned school is required.')
        return
      }
    }

    setBusy(true)
    setEditError('')
    try {
      const updated = await updateAdminAccount(editAdmin, {
        firstName,
        lastName,
        middleName,
        suffix,
        role,
        school,
      })
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
          <span className="admin-admins__header-filter" ref={nameFilterRef}>
            <button
              ref={nameButtonRef}
              type="button"
              className={
                sortKey === 'name' ? 'admin-admins__sort admin-admins__sort--active' : 'admin-admins__sort'
              }
              aria-haspopup="listbox"
              aria-expanded={openHeaderMenu === 'name'}
              aria-label="Sort by admin name"
              onClick={() => toggleHeaderMenu('name')}
            >
              Admin
              <IconCaret />
            </button>
          </span>
          <span>Email</span>
          <span className="admin-admins__header-filter" ref={roleFilterRef}>
            <button
              ref={roleButtonRef}
              type="button"
              className={
                roleFilter ? 'admin-admins__sort admin-admins__sort--active' : 'admin-admins__sort'
              }
              aria-haspopup="listbox"
              aria-expanded={openHeaderMenu === 'role'}
              aria-label="Filter by role"
              onClick={() => toggleHeaderMenu('role')}
            >
              Role
              <IconCaret />
            </button>
          </span>
          <span className="admin-admins__header-filter" ref={schoolFilterRef}>
            <button
              ref={schoolButtonRef}
              type="button"
              className={
                sortKey === 'school' ? 'admin-admins__sort admin-admins__sort--active' : 'admin-admins__sort'
              }
              aria-haspopup="listbox"
              aria-expanded={openHeaderMenu === 'school'}
              aria-label="Sort by assigned school"
              onClick={() => toggleHeaderMenu('school')}
            >
              Assigned School
              <IconCaret />
            </button>
          </span>
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
            <li className="admin-admins__empty-row">
              {roleFilter ? 'No admins found for this role.' : 'No admins match your search.'}
            </li>
          ) : null}
        </ul>
      </div>

      {openHeaderMenu === 'name' || openHeaderMenu === 'school'
        ? createPortal(
            <ul
              ref={headerMenuRef}
              className="admin-admins__header-menu admin-admins__header-menu--portal"
              role="listbox"
              aria-label={
                openHeaderMenu === 'name' ? 'Sort by admin name' : 'Sort by assigned school'
              }
              style={{
                top: headerMenuPos.top,
                left: headerMenuPos.left,
                minWidth: headerMenuPos.minWidth,
              }}
            >
              {SORT_OPTIONS.map((option) => {
                const selected = sortKey === openHeaderMenu && sortMode === option.key
                return (
                  <li key={option.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={
                        selected
                          ? 'admin-admins__header-option is-active'
                          : 'admin-admins__header-option'
                      }
                      onClick={() => selectSort(openHeaderMenu, option.key)}
                    >
                      {option.label}
                    </button>
                  </li>
                )
              })}
            </ul>,
            document.body
          )
        : null}

      {openHeaderMenu === 'role'
        ? createPortal(
            <ul
              ref={headerMenuRef}
              className="admin-admins__header-menu admin-admins__header-menu--portal"
              role="listbox"
              aria-label="Role filter"
              style={{
                top: headerMenuPos.top,
                left: headerMenuPos.left,
                minWidth: headerMenuPos.minWidth,
              }}
            >
              {ROLE_FILTER_OPTIONS.map((option) => (
                <li key={option.key || 'all'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={roleFilter === option.key}
                    className={
                      roleFilter === option.key
                        ? 'admin-admins__header-option is-active'
                        : 'admin-admins__header-option'
                    }
                    onClick={() => selectRoleFilter(option.key)}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}

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
              <div className="admin-schools-modal__name-grid">
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
                  placeholder="Last Name"
                  aria-label="Last Name"
                />
                <input
                  className="admin-schools-modal__input"
                  type="text"
                  value={form.middleName}
                  onChange={updateField('middleName')}
                  placeholder="Middle Name"
                  aria-label="Middle Name"
                />
                <input
                  className="admin-schools-modal__input"
                  type="text"
                  value={form.suffix}
                  onChange={updateField('suffix')}
                  placeholder="Suffix"
                  aria-label="Suffix"
                />
              </div>
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
                {adminRoleOptions(roles, { includeSystemAdmin: false }).map((role) => (
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
              <div className="admin-schools-modal__name-grid">
                <input
                  className="admin-schools-modal__input"
                  type="text"
                  value={editForm.firstName}
                  onChange={updateEditField('firstName')}
                  placeholder="First Name"
                  aria-label="First Name"
                  autoFocus
                />
                <input
                  className="admin-schools-modal__input"
                  type="text"
                  value={editForm.lastName}
                  onChange={updateEditField('lastName')}
                  placeholder="Last Name"
                  aria-label="Last Name"
                />
                <input
                  className="admin-schools-modal__input"
                  type="text"
                  value={editForm.middleName}
                  onChange={updateEditField('middleName')}
                  placeholder="Middle Name"
                  aria-label="Middle Name"
                />
                <input
                  className="admin-schools-modal__input"
                  type="text"
                  value={editForm.suffix}
                  onChange={updateEditField('suffix')}
                  placeholder="Suffix"
                  aria-label="Suffix"
                />
              </div>
              {!isSystemAdmin(editAdmin.role) ? (
                <select
                  className="admin-schools-modal__input"
                  value={editForm.school}
                  onChange={updateEditField('school')}
                  aria-label="Assigned School"
                >
                  <option value="">Select school</option>
                  {schoolChoices(schools, editForm.school).map((school) => (
                    <option key={school.school_id} value={school.name}>
                      {school.name}
                    </option>
                  ))}
                </select>
              ) : null}

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
          className="admin-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal()
          }}
        >
          <div
            className="admin-dash-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-admin-title"
          >
            <h3 id="delete-admin-title" className="admin-dash-modal__title">
              Delete Admin
            </h3>
            <div className="admin-dash-modal__divider" />
            <div className="admin-dash-modal__actions">
              <button
                type="button"
                className="admin-dash-modal__btn admin-dash-modal__btn--confirm"
                onClick={handleConfirmDelete}
                disabled={busy}
              >
                {busy ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                type="button"
                className="admin-dash-modal__btn admin-dash-modal__btn--secondary"
                onClick={closeDeleteModal}
                disabled={busy}
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
