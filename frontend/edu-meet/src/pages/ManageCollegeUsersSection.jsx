import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  assignableRoleOptions,
  createCollegeUser,
  loadCollegeUsers,
  removeCollegeUser,
  roleRequiresDepartment,
  updateCollegeUser,
} from '../api/collegeUsersAdmin'
import { isLettersOnlyName } from '../api/nameValidation'
import { normalizeRoleKey } from '../api/roles'

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  email: '',
  roleName: '',
  departmentId: '',
}

const ROLE_FILTER_OPTIONS = [
  { key: '', label: 'All roles' },
  { key: 'collegedean', label: 'College Dean' },
  { key: 'programchair', label: 'Program Chair' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'student', label: 'Student' },
]

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

function IconSort() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M7 10l5-5 5 5H7zm0 4l5 5 5-5H7z" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
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

function roleOptionValue(options, roleName) {
  const key = normalizeRoleKey(roleName)
  const match = (options || []).find((opt) => normalizeRoleKey(opt.name) === key)
  return match?.name || ''
}

function UserFormFields({ form, onChange, roleOptions, departments, idPrefix }) {
  return (
    <div className="college-users__form-grid">
      <label className="college-users__field">
        <span className="college-users__sr-only">First Name</span>
        <input
          value={form.firstName}
          onChange={onChange('firstName')}
          placeholder="First Name"
          autoComplete="given-name"
          aria-label="First Name"
        />
      </label>
      <label className="college-users__field">
        <span className="college-users__sr-only">Last Name</span>
        <input
          value={form.lastName}
          onChange={onChange('lastName')}
          placeholder="Last Name"
          autoComplete="family-name"
          aria-label="Last Name"
        />
      </label>
      <label className="college-users__field">
        <span className="college-users__sr-only">Middle Name</span>
        <input
          value={form.middleName}
          onChange={onChange('middleName')}
          placeholder="Middle Name"
          autoComplete="additional-name"
          aria-label="Middle Name"
        />
      </label>
      <label className="college-users__field">
        <span className="college-users__sr-only">Extension Name</span>
        <input
          value={form.suffix}
          onChange={onChange('suffix')}
          placeholder="Extension Name"
          aria-label="Extension Name"
        />
      </label>
      <label className="college-users__field">
        <span className="college-users__sr-only">Email</span>
        <input
          type="email"
          value={form.email}
          onChange={onChange('email')}
          placeholder="Email"
          autoComplete="email"
          aria-label="Email"
        />
      </label>
      <label className="college-users__field">
        <span className="college-users__sr-only">Role</span>
        <select
          id={`${idPrefix}-role`}
          value={form.roleName}
          onChange={onChange('roleName')}
          aria-label="Role"
        >
          <option value="">Role</option>
          {roleOptions.map((opt) => (
            <option key={opt.role_id} value={opt.name}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="college-users__field college-users__field--full">
        <span className="college-users__sr-only">Department</span>
        <select
          id={`${idPrefix}-department`}
          value={form.departmentId}
          onChange={onChange('departmentId')}
          aria-label="Department"
        >
          <option value="">Department</option>
          {departments.map((dept) => (
            <option key={dept.department_id} value={dept.department_id}>
              {dept.slug || dept.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default function ManageCollegeUsersSection({ schoolId }) {
  const [rows, setRows] = useState([])
  const [departments, setDepartments] = useState([])
  const [roleOptions, setRoleOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [roleFilter, setRoleFilter] = useState('')
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [roleMenuPos, setRoleMenuPos] = useState({ top: 0, left: 0, minWidth: 168 })
  const roleFilterRef = useRef(null)
  const roleButtonRef = useRef(null)
  const roleMenuRef = useRef(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [viewRow, setViewRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const data = await loadCollegeUsers(schoolId)
      setRows(data.users)
      setDepartments(data.departments || [])
      setRoleOptions(data.roleOptions || assignableRoleOptions(data.roles || []))
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateRoleMenuPosition = useCallback(() => {
    const button = roleButtonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    setRoleMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 168),
    })
  }, [])

  useLayoutEffect(() => {
    if (!roleMenuOpen) return undefined
    updateRoleMenuPosition()

    function handleReposition() {
      updateRoleMenuPosition()
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [roleMenuOpen, updateRoleMenuPosition])

  useEffect(() => {
    if (!roleMenuOpen) return undefined

    function handlePointerDown(event) {
      const target = event.target
      const inTrigger = roleFilterRef.current?.contains(target)
      const inMenu = roleMenuRef.current?.contains(target)
      if (!inTrigger && !inMenu) {
        setRoleMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setRoleMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [roleMenuOpen])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows
    if (q) {
      list = list.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q)
      )
    }
    if (roleFilter) {
      list = list.filter((row) => {
        const key = normalizeRoleKey(row.roleName || row.role)
        return key === roleFilter
      })
    }
    if (sortKey === 'department') {
      const dir = sortDir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        const left = String(a.department || '').toLowerCase()
        const right = String(b.department || '').toLowerCase()
        return left.localeCompare(right) * dir
      })
    }
    return list
  }, [rows, query, roleFilter, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  function selectRoleFilter(key) {
    setRoleFilter(key)
    setRoleMenuOpen(false)
  }

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setError('')
  }

  function closeEditModal() {
    setEditRow(null)
    setEditForm(EMPTY_FORM)
    setEditError('')
  }

  function closeDeleteModal() {
    setDeleteRow(null)
  }

  function closeViewModal() {
    setViewRow(null)
  }

  function openModal() {
    setViewRow(null)
    setEditRow(null)
    setDeleteRow(null)
    setInfo('')
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  function openViewModal(row) {
    setModalOpen(false)
    setEditRow(null)
    setDeleteRow(null)
    setViewRow(row)
  }

  function openEditModal(row) {
    setModalOpen(false)
    setViewRow(null)
    setDeleteRow(null)
    setEditError('')
    setEditForm({
      firstName: row.firstName || '',
      middleName: row.middleName || '',
      lastName: row.lastName || '',
      suffix: row.suffix || '',
      email: row.email || '',
      roleName: roleOptionValue(roleOptions, row.roleName) || '',
      departmentId: row.departmentId != null ? String(row.departmentId) : '',
    })
    setEditRow(row)
  }

  function openDeleteModal(row) {
    setModalOpen(false)
    setViewRow(null)
    setEditRow(null)
    setDeleteRow(row)
  }

  function updateField(setter, errorSetter) {
    return (field) => (event) => {
      const value = event.target.value
      setter((prev) => ({ ...prev, [field]: value }))
      errorSetter('')
    }
  }

  function validateForm(data) {
    const firstName = data.firstName.trim()
    const middleName = data.middleName.trim()
    const lastName = data.lastName.trim()
    const suffix = data.suffix.trim()
    const email = data.email.trim().toLowerCase()
    const roleName = data.roleName.trim()
    const departmentId = data.departmentId

    if (!firstName || !lastName || !email || !roleName) {
      return { ok: false, message: 'First name, last name, email, and role are required.' }
    }
    if (!isLettersOnlyName(firstName)) {
      return { ok: false, message: 'First name must contain letters only.' }
    }
    if (!isLettersOnlyName(lastName)) {
      return { ok: false, message: 'Last name must contain letters only.' }
    }
    if (middleName && !isLettersOnlyName(middleName)) {
      return { ok: false, message: 'Middle name must contain letters only.' }
    }
    if (suffix && !isLettersOnlyName(suffix)) {
      return { ok: false, message: 'Suffix must contain letters only.' }
    }
    if (!isValidEmail(email)) {
      return { ok: false, message: 'Enter a valid email.' }
    }
    if (
      roleRequiresDepartment(roleName) &&
      departments.length > 0 &&
      (departmentId === '' || departmentId == null)
    ) {
      return { ok: false, message: 'Department is required for this role.' }
    }

    return {
      ok: true,
      value: {
        firstName,
        middleName,
        lastName,
        suffix,
        email,
        roleName,
        departmentId: departmentId === '' ? null : departmentId,
      },
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    const result = validateForm(form)
    if (!result.ok) {
      setError(result.message)
      return
    }

    setBusy(true)
    setError('')
    setInfo('')
    try {
      const created = await createCollegeUser({ schoolId, ...result.value })
      await refresh()
      setInfo(`User created. Temporary password: ${created.temporaryPassword}`)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditSave(event) {
    event.preventDefault()
    if (!editRow) return

    const result = validateForm(editForm)
    if (!result.ok) {
      setEditError(result.message)
      return
    }

    setBusy(true)
    setEditError('')
    try {
      await updateCollegeUser(editRow, result.value)
      await refresh()
      closeEditModal()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteRow) return
    setBusy(true)
    try {
      await removeCollegeUser(deleteRow.membershipId, deleteRow.userId)
      setRows((prev) => prev.filter((item) => item.membershipId !== deleteRow.membershipId))
      closeDeleteModal()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to delete user.')
      closeDeleteModal()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!modalOpen && !viewRow && !editRow && !deleteRow) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        if (deleteRow) closeDeleteModal()
        else if (editRow) closeEditModal()
        else if (viewRow) closeViewModal()
        else closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, viewRow, editRow, deleteRow])

  const updateFormField = updateField(setForm, setError)
  const updateEditField = updateField(setEditForm, setEditError)

  return (
    <section className="college-users" aria-label="User management">
      <div className="college-users__intro">
        <h2 className="college-users__title">User Management</h2>
        <p className="college-users__subtitle">Manage User Accounts</p>
      </div>

      {listError ? (
        <p className="college-dash__api-error" role="alert">
          {listError}
        </p>
      ) : null}
      {info ? (
        <p className="college-users__info" role="status">
          {info}
        </p>
      ) : null}
      {loading ? <p className="college-dash__api-status">Loading users…</p> : null}

      <div className="college-users__toolbar">
        <label className="college-users__search">
          <IconSearch />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users by name or email..."
            aria-label="Search users"
          />
        </label>
        <button type="button" className="college-users__add" onClick={openModal} disabled={busy}>
          <IconPlus />
          Add User
        </button>
      </div>

      <div className="college-users__table-wrap">
        <table className="college-users__table">
          <thead>
            <tr>
              <th scope="col">USER</th>
              <th scope="col">EMAIL</th>
              <th scope="col">
                <div className="college-users__role-filter" ref={roleFilterRef}>
                  <button
                    ref={roleButtonRef}
                    type="button"
                    className={
                      roleFilter
                        ? 'college-users__sort college-users__sort--active'
                        : 'college-users__sort'
                    }
                    aria-haspopup="listbox"
                    aria-expanded={roleMenuOpen}
                    aria-label="Filter by role"
                    onClick={() => setRoleMenuOpen((open) => !open)}
                  >
                    ROLE
                    <IconSort />
                  </button>
                </div>
              </th>
              <th scope="col">
                <button
                  type="button"
                  className="college-users__sort"
                  onClick={() => toggleSort('department')}
                >
                  DEPARTMENT
                  <IconSort />
                </button>
              </th>
              <th scope="col">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.membershipId}
                className={row.status === 'inactive' ? 'is-inactive' : undefined}
              >
                <td>
                  <span className="college-users__name">{row.name}</span>
                  {row.status === 'inactive' ? (
                    <span className="college-users__badge">Inactive</span>
                  ) : null}
                </td>
                <td>{row.email}</td>
                <td>{row.role}</td>
                <td>{row.department}</td>
                <td>
                  <div className="college-users__actions">
                    <button
                      type="button"
                      className="college-users__icon-btn"
                      aria-label={`View ${row.name}`}
                      title="View"
                      disabled={busy}
                      onClick={() => openViewModal(row)}
                    >
                      <IconMore />
                    </button>
                    <button
                      type="button"
                      className="college-users__icon-btn"
                      aria-label={`Edit ${row.name}`}
                      disabled={busy}
                      onClick={() => openEditModal(row)}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="college-users__icon-btn"
                      aria-label={`Delete ${row.name}`}
                      disabled={busy}
                      onClick={() => openDeleteModal(row)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="college-users__empty">
                  {roleFilter
                    ? 'No users found for this role.'
                    : 'No users found for this school.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {roleMenuOpen
        ? createPortal(
            <ul
              ref={roleMenuRef}
              className="college-users__role-menu college-users__role-menu--portal"
              role="listbox"
              aria-label="Role filter"
              style={{
                top: roleMenuPos.top,
                left: roleMenuPos.left,
                minWidth: roleMenuPos.minWidth,
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
                        ? 'college-users__role-option is-active'
                        : 'college-users__role-option'
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

      {viewRow ? (
        <div
          className="college-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeViewModal()
          }}
        >
          <div
            className="college-dash-modal__panel college-dash-modal__panel--user-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="college-view-user-title"
          >
            <h3 id="college-view-user-title" className="college-users__modal-title">
              All User Information
            </h3>

            <div className="college-users__form-grid">
              <label className="college-users__field">
                <span className="college-users__sr-only">First Name</span>
                <input value={viewRow.firstName || ''} readOnly disabled placeholder="First Name" />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Last Name</span>
                <input value={viewRow.lastName || ''} readOnly disabled placeholder="Last Name" />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Middle Name</span>
                <input
                  value={viewRow.middleName || ''}
                  readOnly
                  disabled
                  placeholder="Middle Name"
                />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Extension Name</span>
                <input
                  value={viewRow.suffix || ''}
                  readOnly
                  disabled
                  placeholder="Extension Name"
                />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Email</span>
                <input value={viewRow.email || ''} readOnly disabled placeholder="Email" />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Role</span>
                <input value={viewRow.role || ''} readOnly disabled placeholder="Role" />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Department</span>
                <input
                  value={
                    viewRow.department && viewRow.department !== '—'
                      ? viewRow.department
                      : ''
                  }
                  readOnly
                  disabled
                  placeholder="Department"
                />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">User ID</span>
                <input
                  value={viewRow.userId != null ? String(viewRow.userId) : ''}
                  readOnly
                  disabled
                  placeholder="User ID"
                />
              </label>
            </div>

            <div className="college-dash-modal__divider" />

            <div className="college-users__modal-actions">
              <button
                type="button"
                className="college-users__modal-btn college-users__modal-btn--primary"
                onClick={closeViewModal}
              >
                RETURN
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="college-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <form
            className="college-dash-modal__panel college-dash-modal__panel--user-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="college-add-user-title"
            onSubmit={handleCreate}
          >
            <h3 id="college-add-user-title" className="college-users__modal-title">
              Add New User
            </h3>

            <UserFormFields
              form={form}
              onChange={updateFormField}
              roleOptions={roleOptions}
              departments={departments}
              idPrefix="add-user"
            />

            {error ? (
              <p className="college-dash__api-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="college-dash-modal__divider" />

            <div className="college-users__modal-actions">
              <button
                type="submit"
                className="college-users__modal-btn college-users__modal-btn--primary"
                disabled={busy}
              >
                {busy ? 'CREATING…' : 'CREATE ACCOUNT'}
              </button>
              <button
                type="button"
                className="college-users__modal-btn college-users__modal-btn--primary"
                onClick={closeModal}
                disabled={busy}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editRow ? (
        <div
          className="college-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeEditModal()
          }}
        >
          <form
            className="college-dash-modal__panel college-dash-modal__panel--user-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="college-edit-user-title"
            onSubmit={handleEditSave}
          >
            <h3 id="college-edit-user-title" className="college-users__modal-title">
              Edit User
            </h3>

            <UserFormFields
              form={editForm}
              onChange={updateEditField}
              roleOptions={roleOptions}
              departments={departments}
              idPrefix="edit-user"
            />

            {editError ? (
              <p className="college-dash__api-error" role="alert">
                {editError}
              </p>
            ) : null}

            <div className="college-dash-modal__divider" />

            <div className="college-users__modal-actions">
              <button
                type="submit"
                className="college-users__modal-btn college-users__modal-btn--primary"
                disabled={busy}
              >
                {busy ? 'SAVING…' : 'SAVE'}
              </button>
              <button
                type="button"
                className="college-users__modal-btn college-users__modal-btn--primary"
                onClick={closeEditModal}
                disabled={busy}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteRow ? (
        <div
          className="college-dash-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal()
          }}
        >
          <div
            className="college-dash-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="college-delete-user-title"
          >
            <h3 id="college-delete-user-title" className="college-dash-modal__title">
              Delete {deleteRow.name}?
            </h3>
            <div className="college-dash-modal__divider" />
            <p className="college-users__confirm-text">
              This removes their school membership. If they have no other memberships, the user
              account is deleted.
            </p>
            <div className="college-dash-modal__actions">
              <button
                type="button"
                className="college-dash-modal__btn college-dash-modal__btn--confirm"
                onClick={handleConfirmDelete}
                disabled={busy}
              >
                {busy ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                type="button"
                className="college-dash-modal__btn college-dash-modal__btn--secondary"
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
