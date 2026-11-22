import { useCallback, useEffect, useMemo, useState } from 'react'
import { mapSchoolFromApi } from '../api/schools'
import {
  approveSchoolRequest,
  createApprovedSchool,
  loadSchoolsForAdmin,
  rejectSchoolRequest,
  removeSchool,
  updateSchoolDetails,
} from '../api/schoolsAdmin'

const EMPTY_FORM = {
  name: '',
  address: '',
  email: '',
}

const EMPTY_EDIT_FORM = {
  name: '',
  address: '',
}

function IconSchool() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10l9-5 9 5-9 5-9-5z" />
      <path d="M7 12.5V17c0 .8 2.2 2 5 2s5-1.2 5-2v-4.5" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  )
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

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
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

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
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

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-US')
}

export default function ManageSchoolsSection() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewSchool, setViewSchool] = useState(null)
  const [editSchool, setEditSchool] = useState(null)
  const [reviewSchool, setReviewSchool] = useState(null)
  const [deleteSchool, setDeleteSchool] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')

  const refreshSchools = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const rows = await loadSchoolsForAdmin()
      setSchools(rows)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load schools.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSchools()
  }, [refreshSchools])

  const filteredSchools = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return schools
    return schools.filter((school) => school.name.toLowerCase().includes(q))
  }, [query, schools])

  const total = schools.length
  const pending = schools.filter((s) => s.status === 'pending').length
  const approved = schools.filter((s) => s.status === 'approved').length

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setError('')
  }

  function closeViewModal() {
    setViewSchool(null)
  }

  function closeEditModal() {
    setEditSchool(null)
    setEditForm(EMPTY_EDIT_FORM)
    setEditError('')
  }

  function closeReviewModal() {
    setReviewSchool(null)
  }

  function closeDeleteModal() {
    setDeleteSchool(null)
  }

  function openModal() {
    setForm(EMPTY_FORM)
    setError('')
    setViewSchool(null)
    setEditSchool(null)
    setReviewSchool(null)
    setDeleteSchool(null)
    setModalOpen(true)
  }

  function openViewModal(school) {
    setModalOpen(false)
    setEditSchool(null)
    setReviewSchool(null)
    setDeleteSchool(null)
    setViewSchool(school)
  }

  function openEditModal(school) {
    setModalOpen(false)
    setViewSchool(null)
    setReviewSchool(null)
    setDeleteSchool(null)
    setEditError('')
    setEditForm({
      name: school.name || '',
      address: school.address || '',
    })
    setEditSchool(school)
  }

  function openReviewModal(school) {
    setModalOpen(false)
    setViewSchool(null)
    setEditSchool(null)
    setDeleteSchool(null)
    setReviewSchool(school)
  }

  function openDeleteModal(school) {
    setModalOpen(false)
    setViewSchool(null)
    setEditSchool(null)
    setReviewSchool(null)
    setDeleteSchool(school)
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

  async function handleCreate(event) {
    event.preventDefault()

    const name = form.name.trim()
    const address = form.address.trim()
    const email = form.email.trim().toLowerCase()

    if (!name || !address || !email) {
      setError('School name, address, and email are required.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid school email.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const created = await createApprovedSchool({ name, address, email })
      setSchools((prev) => [...prev, created])
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create school.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditSave(event) {
    event.preventDefault()

    if (!editSchool) return

    const name = editForm.name.trim()
    const address = editForm.address.trim()

    if (!name || !address) {
      setEditError('School name and address are required.')
      return
    }

    setBusy(true)
    setEditError('')
    try {
      const updated = await updateSchoolDetails(editSchool.id, { name, address })
      const mapped = mapSchoolFromApi(updated, {
        totalUsers: editSchool.totalUsers,
        departments: editSchool.departments,
      })
      setSchools((prev) =>
        prev.map((school) => (school.id === editSchool.id ? mapped : school))
      )
      closeEditModal()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update school.')
    } finally {
      setBusy(false)
    }
  }

  async function handleApproveReview() {
    if (!reviewSchool) return
    setBusy(true)
    try {
      await approveSchoolRequest(reviewSchool.id)
      setSchools((prev) =>
        prev.map((school) =>
          school.id === reviewSchool.id ? { ...school, status: 'approved' } : school
        )
      )
      closeReviewModal()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to approve school.')
      closeReviewModal()
    } finally {
      setBusy(false)
    }
  }

  async function handleRejectReview() {
    if (!reviewSchool) return
    setBusy(true)
    try {
      await rejectSchoolRequest(reviewSchool.id)
      setSchools((prev) => prev.filter((school) => school.id !== reviewSchool.id))
      closeReviewModal()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to reject school.')
      closeReviewModal()
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteSchool) return
    setBusy(true)
    try {
      await removeSchool(deleteSchool.id)
      setSchools((prev) => prev.filter((school) => school.id !== deleteSchool.id))
      closeDeleteModal()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to delete school.')
      closeDeleteModal()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!modalOpen && !viewSchool && !editSchool && !reviewSchool && !deleteSchool) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        if (deleteSchool) closeDeleteModal()
        else if (reviewSchool) closeReviewModal()
        else if (editSchool) closeEditModal()
        else if (viewSchool) closeViewModal()
        else closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, viewSchool, editSchool, reviewSchool, deleteSchool])

  return (
    <section className="admin-schools" aria-label="School management">
      <div className="admin-schools__intro">
        <h2 className="admin-schools__title">School Management</h2>
        <p className="admin-schools__subtitle">
          View, manage, and approve schools registered on Edu-Meet.
        </p>
        {listError ? (
          <p className="admin-dash__api-error" role="alert">
            {listError}
          </p>
        ) : null}
        {loading ? <p className="admin-dash__api-status">Loading schools…</p> : null}
      </div>

      <div className="admin-schools__stats" aria-label="School stats">
        <article className="admin-schools__stat admin-schools__stat--total">
          <span className="admin-schools__stat-icon">
            <IconSchool />
          </span>
          <p className="admin-schools__stat-value">{total}</p>
          <p className="admin-schools__stat-label">Total School</p>
        </article>

        <article className="admin-schools__stat admin-schools__stat--pending">
          <span className="admin-schools__stat-icon">
            <IconClock />
          </span>
          <p className="admin-schools__stat-value">{pending}</p>
          <p className="admin-schools__stat-label">Pending Requests</p>
        </article>

        <article className="admin-schools__stat admin-schools__stat--approved">
          <span className="admin-schools__stat-icon">
            <IconCheck />
          </span>
          <p className="admin-schools__stat-value">{approved}</p>
          <p className="admin-schools__stat-label">Approved Schools</p>
        </article>
      </div>

      <div className="admin-schools__toolbar">
        <label className="admin-schools__search">
          <IconSearch />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search school name..."
            aria-label="Search school name"
          />
        </label>

        <button type="button" className="admin-schools__add" onClick={openModal}>
          <IconPlus />
          Add School
        </button>
      </div>

      <div className="admin-schools__table-wrap">
        <div className="admin-schools__table-head" role="row">
          <span>School Name</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        <ul className="admin-schools__table-body">
          {filteredSchools.map((school) => (
            <li key={school.id} className="admin-schools__row">
              <span className="admin-schools__name">{school.name}</span>
              <span className="admin-schools__status">
                {school.status === 'pending' ? 'Pending' : 'Approved'}
              </span>
              <span className="admin-schools__actions">
                {school.status === 'pending' ? (
                  <button
                    type="button"
                    className="admin-schools__review"
                    onClick={() => openReviewModal(school)}
                  >
                    Review
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="admin-schools__icon-btn"
                      aria-label={`View ${school.name}`}
                      onClick={() => openViewModal(school)}
                    >
                      <IconMore />
                    </button>
                    <button
                      type="button"
                      className="admin-schools__icon-btn"
                      aria-label={`Edit ${school.name}`}
                      onClick={() => openEditModal(school)}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="admin-schools__icon-btn"
                      aria-label={`Delete ${school.name}`}
                      onClick={() => openDeleteModal(school)}
                    >
                      <IconTrash />
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}

          {!loading && filteredSchools.length === 0 ? (
            <li className="admin-schools__empty-row">
              {query.trim() ? 'No schools match your search.' : 'No schools found.'}
            </li>
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
            aria-labelledby="add-school-title"
          >
            <h3 id="add-school-title" className="admin-schools-modal__title">
              Add New School
            </h3>

            <form className="admin-schools-modal__form" onSubmit={handleCreate}>
              <input
                className="admin-schools-modal__input"
                type="text"
                value={form.name}
                onChange={updateField('name')}
                placeholder="School Name"
                aria-label="School Name"
                autoFocus
              />
              <input
                className="admin-schools-modal__input"
                type="text"
                value={form.address}
                onChange={updateField('address')}
                placeholder="School Address"
                aria-label="School Address"
              />
              <input
                className="admin-schools-modal__input"
                type="email"
                value={form.email}
                onChange={updateField('email')}
                placeholder="School Email"
                aria-label="School Email"
              />

              {error ? <p className="admin-schools-modal__error">{error}</p> : null}

              <div className="admin-schools-modal__divider" />

              <div className="admin-schools-modal__actions">
                <button type="submit" className="admin-schools-modal__btn">
                  Create School
                </button>
                <button type="button" className="admin-schools-modal__btn" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {viewSchool ? (
        <div
          className="admin-schools-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeViewModal()
          }}
        >
          <div
            className="admin-schools-modal__panel admin-schools-modal__panel--view"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-school-title"
          >
            <h3 id="view-school-title" className="admin-schools-modal__title">
              View School
            </h3>

            <div className="admin-schools-modal__form">
              <input
                className="admin-schools-modal__input admin-schools-modal__input--readonly"
                type="text"
                value={viewSchool.name}
                readOnly
                aria-label="School Name"
              />
              <input
                className="admin-schools-modal__input admin-schools-modal__input--readonly"
                type="text"
                value={viewSchool.address || '—'}
                readOnly
                aria-label="School Address"
              />
              <input
                className="admin-schools-modal__input admin-schools-modal__input--readonly"
                type="text"
                value={viewSchool.email || '—'}
                readOnly
                aria-label="School Email"
              />

              <div className="admin-schools-modal__divider" />

              <div className="admin-schools-modal__stats" aria-label="School overview">
                <article className="admin-schools-modal__stat">
                  <span className="admin-schools-modal__stat-icon">
                    <IconUsers />
                  </span>
                  <p className="admin-schools-modal__stat-value">{formatCount(viewSchool.totalUsers)}</p>
                  <p className="admin-schools-modal__stat-label">Total Users</p>
                </article>
                <article className="admin-schools-modal__stat">
                  <span className="admin-schools-modal__stat-icon">
                    <IconBuilding />
                  </span>
                  <p className="admin-schools-modal__stat-value">{formatCount(viewSchool.departments)}</p>
                  <p className="admin-schools-modal__stat-label">Departments</p>
                </article>
              </div>

              <div className="admin-schools-modal__actions">
                <button type="button" className="admin-schools-modal__btn" onClick={closeViewModal}>
                  Return
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editSchool ? (
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
            aria-labelledby="edit-school-title"
          >
            <h3 id="edit-school-title" className="admin-schools-modal__title">
              Edit School
            </h3>

            <form className="admin-schools-modal__form" onSubmit={handleEditSave}>
              <input
                className="admin-schools-modal__input"
                type="text"
                value={editForm.name}
                onChange={updateEditField('name')}
                placeholder="School Name"
                aria-label="School Name"
                autoFocus
              />
              <input
                className="admin-schools-modal__input"
                type="text"
                value={editForm.address}
                onChange={updateEditField('address')}
                placeholder="School Address"
                aria-label="School Address"
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

      {reviewSchool ? (
        <div
          className="admin-schools-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeReviewModal()
          }}
        >
          <div
            className="admin-schools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-school-title"
          >
            <button
              type="button"
              className="admin-schools-modal__close"
              aria-label="Close"
              onClick={closeReviewModal}
            >
              <IconClose />
            </button>
            <h3 id="review-school-title" className="admin-schools-modal__title">
              School Registration Details
            </h3>

            <div className="admin-schools-modal__form">
              <input
                className="admin-schools-modal__input admin-schools-modal__input--readonly"
                type="text"
                value={reviewSchool.name}
                readOnly
                aria-label="School Name"
              />
              <input
                className="admin-schools-modal__input admin-schools-modal__input--readonly"
                type="text"
                value={reviewSchool.address || '—'}
                readOnly
                aria-label="School Address"
              />
              <input
                className="admin-schools-modal__input admin-schools-modal__input--readonly"
                type="text"
                value={reviewSchool.email || '—'}
                readOnly
                aria-label="School Email"
              />

              <div className="admin-schools-modal__divider" />

              <div className="admin-schools-modal__actions">
                <button
                  type="button"
                  className="admin-schools-modal__btn admin-schools-modal__btn--approve"
                  onClick={handleApproveReview}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-schools-modal__btn admin-schools-modal__btn--reject"
                  onClick={handleRejectReview}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteSchool ? (
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
            aria-labelledby="delete-school-title"
          >
            <h3 id="delete-school-title" className="admin-schools-modal__title">
              Delete School
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
