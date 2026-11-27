import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createCollegeDepartment,
  loadCollegeDepartments,
  removeCollegeDepartment,
  updateCollegeDepartment,
} from '../api/collegeDepartmentsAdmin'
import { isLettersOnlyName } from '../api/nameValidation'

const EMPTY_FORM = {
  name: '',
  deanMembershipId: '',
}

const DEPT_SORT_OPTIONS = [
  { key: 'az', label: 'A-Z' },
  { key: 'latest', label: 'Latest to Oldest Added' },
  { key: 'oldest', label: 'Oldest to Latest Added' },
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

function IconStudents() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 3L2 8l10 5 8-4v6h2V8L12 3z" />
      <path d="M6 12.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-3.5" opacity="0.85" />
    </svg>
  )
}

function IconFaculty() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3.2 3.6-4.8 7-4.8s5.8 1.6 7 4.8" />
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

function createdSortValue(row) {
  const parsed = Date.parse(row.createdAt || '')
  if (Number.isFinite(parsed)) return parsed
  return Number(row.id) || 0
}

export default function ManageCollegeDepartmentsSection({ schoolId }) {
  const [rows, setRows] = useState([])
  const [deanOptions, setDeanOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [deptSortMode, setDeptSortMode] = useState(null)
  const [deptMenuOpen, setDeptMenuOpen] = useState(false)
  const [deptMenuPos, setDeptMenuPos] = useState({ top: 0, left: 0, minWidth: 200 })
  const deptFilterRef = useRef(null)
  const deptButtonRef = useRef(null)
  const deptMenuRef = useRef(null)
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
      const data = await loadCollegeDepartments(schoolId)
      setRows(data.departments || [])
      setDeanOptions(data.deanOptions || [])
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load departments.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateDeptMenuPosition = useCallback(() => {
    const button = deptButtonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    setDeptMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 200),
    })
  }, [])

  useLayoutEffect(() => {
    if (!deptMenuOpen) return undefined
    updateDeptMenuPosition()

    function handleReposition() {
      updateDeptMenuPosition()
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [deptMenuOpen, updateDeptMenuPosition])

  useEffect(() => {
    if (!deptMenuOpen) return undefined

    function handlePointerDown(event) {
      const target = event.target
      const inTrigger = deptFilterRef.current?.contains(target)
      const inMenu = deptMenuRef.current?.contains(target)
      if (!inTrigger && !inMenu) {
        setDeptMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setDeptMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [deptMenuOpen])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows
    if (q) {
      list = list.filter(
        (row) =>
          row.slug.toLowerCase().includes(q) ||
          row.name.toLowerCase().includes(q) ||
          String(row.dean).toLowerCase().includes(q) ||
          String(row.id).includes(q)
      )
    }
    if (deptSortMode === 'az') {
      list = [...list].sort((a, b) =>
        String(a.name || a.slug || '')
          .toLowerCase()
          .localeCompare(String(b.name || b.slug || '').toLowerCase())
      )
    } else if (deptSortMode === 'latest') {
      list = [...list].sort((a, b) => createdSortValue(b) - createdSortValue(a))
    } else if (deptSortMode === 'oldest') {
      list = [...list].sort((a, b) => createdSortValue(a) - createdSortValue(b))
    }
    return list
  }, [rows, query, deptSortMode])

  function selectDeptSort(mode) {
    setDeptSortMode(mode)
    setDeptMenuOpen(false)
  }

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setError('')
  }

  function closeViewModal() {
    setViewRow(null)
  }

  function closeEditModal() {
    setEditRow(null)
    setEditForm(EMPTY_FORM)
    setEditError('')
  }

  function closeDeleteModal() {
    setDeleteRow(null)
  }

  function openModal() {
    setViewRow(null)
    setEditRow(null)
    setDeleteRow(null)
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
      name: row.name || row.slug || '',
      deanMembershipId: row.deanMembershipId != null ? String(row.deanMembershipId) : '',
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
      setter((prev) => ({ ...prev, [field]: event.target.value }))
      errorSetter('')
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    const name = form.name.trim()
    const deanMembershipId = form.deanMembershipId

    if (!name) {
      setError('Department name is required.')
      return
    }
    if (!isLettersOnlyName(name)) {
      setError('Department name must contain letters only.')
      return
    }
    if (!deanMembershipId) {
      setError('Select a College Dean.')
      return
    }
    if (deanOptions.length === 0) {
      setError('No College Dean accounts exist for this school yet. Add one under Manage Users first.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await createCollegeDepartment({ schoolId, name, deanMembershipId })
      await refresh()
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditSave(event) {
    event.preventDefault()
    if (!editRow) return

    const name = editForm.name.trim()
    const deanMembershipId = editForm.deanMembershipId

    if (!name) {
      setEditError('Department name is required.')
      return
    }
    if (!isLettersOnlyName(name)) {
      setEditError('Department name must contain letters only.')
      return
    }
    if (!deanMembershipId) {
      setEditError('Select a College Dean.')
      return
    }

    setBusy(true)
    setEditError('')
    try {
      await updateCollegeDepartment({
        schoolId,
        departmentId: editRow.id,
        name,
        deanMembershipId,
        previousDeanMembershipId: editRow.deanMembershipId,
      })
      await refresh()
      closeEditModal()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update department.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteRow) return
    setBusy(true)
    try {
      await removeCollegeDepartment({
        departmentId: deleteRow.id,
        deanMembershipId: deleteRow.deanMembershipId,
      })
      setRows((prev) => prev.filter((row) => row.id !== deleteRow.id))
      closeDeleteModal()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to delete department.')
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
    <section className="college-depts" aria-label="Department management">
      <div className="college-depts__intro">
        <h2 className="college-depts__title">Department Management</h2>
        <p className="college-depts__subtitle">Manage Departments</p>
      </div>

      {listError ? (
        <p className="college-dash__api-error" role="alert">
          {listError}
        </p>
      ) : null}
      {loading ? <p className="college-dash__api-status">Loading departments…</p> : null}

      <div className="college-depts__toolbar">
        <label className="college-depts__search">
          <IconSearch />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search departments..."
            aria-label="Search departments"
          />
        </label>
        <button type="button" className="college-depts__add" onClick={openModal} disabled={busy}>
          <IconPlus />
          Add Department
        </button>
      </div>

      <div className="college-depts__table-wrap">
        <table className="college-depts__table">
          <thead>
            <tr>
              <th scope="col">
                <div className="college-users__role-filter" ref={deptFilterRef}>
                  <button
                    ref={deptButtonRef}
                    type="button"
                    className={
                      deptSortMode
                        ? 'college-users__sort college-users__sort--active'
                        : 'college-users__sort'
                    }
                    aria-haspopup="listbox"
                    aria-expanded={deptMenuOpen}
                    aria-label="Sort by department name"
                    onClick={() => setDeptMenuOpen((open) => !open)}
                  >
                    DEPARTMENT
                    <IconCaret />
                  </button>
                </div>
              </th>
              <th scope="col">DEAN</th>
              <th scope="col">ID</th>
              <th scope="col">FACULTY</th>
              <th scope="col">STUDENTS</th>
              <th scope="col">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>{row.name || row.slug}</td>
                <td>{row.dean}</td>
                <td>{row.id}</td>
                <td>{row.facultyCount.toLocaleString('en-US')}</td>
                <td>{row.studentCount.toLocaleString('en-US')}</td>
                <td>
                  <div className="college-users__actions">
                    <button
                      type="button"
                      className="college-users__icon-btn"
                      aria-label={`View ${row.slug}`}
                      title="View"
                      disabled={busy}
                      onClick={() => openViewModal(row)}
                    >
                      <IconMore />
                    </button>
                    <button
                      type="button"
                      className="college-users__icon-btn"
                      aria-label={`Edit ${row.slug}`}
                      disabled={busy}
                      onClick={() => openEditModal(row)}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="college-users__icon-btn"
                      aria-label={`Delete ${row.slug}`}
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
                <td colSpan={6} className="college-depts__empty">
                  No departments found for this school.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {deptMenuOpen
        ? createPortal(
            <ul
              ref={deptMenuRef}
              className="college-users__role-menu college-users__role-menu--portal"
              role="listbox"
              aria-label="Sort by department name"
              style={{
                top: deptMenuPos.top,
                left: deptMenuPos.left,
                minWidth: deptMenuPos.minWidth,
              }}
            >
              {DEPT_SORT_OPTIONS.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={deptSortMode === option.key}
                    className={
                      deptSortMode === option.key
                        ? 'college-users__role-option is-active'
                        : 'college-users__role-option'
                    }
                    onClick={() => selectDeptSort(option.key)}
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
            aria-labelledby="college-view-dept-title"
          >
            <h3 id="college-view-dept-title" className="college-users__modal-title">
              View Department
            </h3>

            <div className="college-depts__form">
              <label className="college-users__field">
                <span className="college-users__sr-only">Department</span>
                <input value={viewRow.slug || ''} readOnly disabled placeholder="Department" />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Department ID</span>
                <input
                  value={viewRow.id != null ? String(viewRow.id) : ''}
                  readOnly
                  disabled
                  placeholder="Department ID"
                />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Dean</span>
                <input
                  value={viewRow.dean && viewRow.dean !== '—' ? viewRow.dean : ''}
                  readOnly
                  disabled
                  placeholder="Dean"
                />
              </label>
            </div>

            <div className="college-dash-modal__divider" />

            <div className="college-depts__view-stats" aria-label="Department stats">
              <article className="college-depts__view-stat">
                <span className="college-depts__view-stat-icon">
                  <IconStudents />
                </span>
                <p className="college-depts__view-stat-value">
                  {viewRow.studentCount.toLocaleString('en-US')}
                </p>
                <p className="college-depts__view-stat-label">Total Students</p>
              </article>
              <article className="college-depts__view-stat">
                <span className="college-depts__view-stat-icon">
                  <IconFaculty />
                </span>
                <p className="college-depts__view-stat-value">
                  {viewRow.facultyCount.toLocaleString('en-US')}
                </p>
                <p className="college-depts__view-stat-label">Total Faculty</p>
              </article>
            </div>

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
            aria-labelledby="college-add-dept-title"
            onSubmit={handleCreate}
          >
            <h3 id="college-add-dept-title" className="college-users__modal-title">
              Add New Department
            </h3>

            <div className="college-depts__form">
              <label className="college-users__field">
                <span className="college-users__sr-only">Department Name</span>
                <input
                  value={form.name}
                  onChange={updateFormField('name')}
                  placeholder="Department Name"
                  aria-label="Department Name"
                />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Dean</span>
                <select
                  value={form.deanMembershipId}
                  onChange={updateFormField('deanMembershipId')}
                  aria-label="Dean"
                >
                  <option value="">Dean</option>
                  {deanOptions.map((opt) => (
                    <option key={opt.membershipId} value={opt.membershipId}>
                      {opt.name}
                      {opt.departmentId ? ' (assigned)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {deanOptions.length === 0 ? (
              <p className="college-dash__api-status">
                Add a College Dean under Manage Users before creating a department.
              </p>
            ) : null}

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
                disabled={busy || deanOptions.length === 0}
              >
                {busy ? 'CREATING…' : 'CREATE DEPARTMENT'}
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
            aria-labelledby="college-edit-dept-title"
            onSubmit={handleEditSave}
          >
            <h3 id="college-edit-dept-title" className="college-users__modal-title">
              Edit Department
            </h3>

            <div className="college-depts__form">
              <label className="college-users__field">
                <span className="college-users__sr-only">Department Name</span>
                <input
                  value={editForm.name}
                  onChange={updateEditField('name')}
                  placeholder="Department Name"
                  aria-label="Department Name"
                />
              </label>
              <label className="college-users__field">
                <span className="college-users__sr-only">Dean</span>
                <select
                  value={editForm.deanMembershipId}
                  onChange={updateEditField('deanMembershipId')}
                  aria-label="Dean"
                >
                  <option value="">Dean</option>
                  {deanOptions.map((opt) => (
                    <option key={opt.membershipId} value={opt.membershipId}>
                      {opt.name}
                      {opt.departmentId && opt.departmentId !== editRow.id
                        ? ' (assigned)'
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                {busy ? 'SAVING…' : 'SAVE CHANGES'}
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
            aria-labelledby="college-delete-dept-title"
          >
            <h3 id="college-delete-dept-title" className="college-dash-modal__title">
              Delete Department
            </h3>
            <div className="college-dash-modal__divider" />
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
