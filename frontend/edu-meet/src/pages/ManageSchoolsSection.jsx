import { useMemo, useState } from 'react'

const SAMPLE_SCHOOLS = [
  { id: 1, name: 'Gordon College', status: 'approved' },
  { id: 2, name: 'Columban College', status: 'approved' },
  { id: 3, name: 'St. Joseph College', status: 'pending' },
]

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

export default function ManageSchoolsSection() {
  const [query, setQuery] = useState('')

  const filteredSchools = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SAMPLE_SCHOOLS
    return SAMPLE_SCHOOLS.filter((school) => school.name.toLowerCase().includes(q))
  }, [query])

  const total = SAMPLE_SCHOOLS.length
  const pending = SAMPLE_SCHOOLS.filter((s) => s.status === 'pending').length
  const approved = SAMPLE_SCHOOLS.filter((s) => s.status === 'approved').length

  return (
    <section className="admin-schools" aria-label="School management">
      <div className="admin-schools__intro">
        <h2 className="admin-schools__title">School Management</h2>
        <p className="admin-schools__subtitle">
          View, manage, and approve schools registered on Edu-Meet.
        </p>
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

        <button type="button" className="admin-schools__add">
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
                  <button type="button" className="admin-schools__review">
                    Review
                  </button>
                ) : (
                  <>
                    <button type="button" className="admin-schools__icon-btn" aria-label={`More actions for ${school.name}`}>
                      <IconMore />
                    </button>
                    <button type="button" className="admin-schools__icon-btn" aria-label={`Edit ${school.name}`}>
                      <IconEdit />
                    </button>
                    <button type="button" className="admin-schools__icon-btn" aria-label={`Delete ${school.name}`}>
                      <IconTrash />
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}

          {filteredSchools.length === 0 ? (
            <li className="admin-schools__empty-row">No schools match your search.</li>
          ) : null}
        </ul>
      </div>
    </section>
  )
}
