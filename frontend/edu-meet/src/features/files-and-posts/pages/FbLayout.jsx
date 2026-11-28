/*
  Page frame for the Group 7 screens.

  SideRail  left sidebar: logo, Classes (opens the list of your classes),
            Announcements, then the notification bell and your profile.
  FbPage    sidebar + page content.
  ClassFrame  (inside a class) the blue banner — class name, subject code,
            schedule, Back to Classes, Join Meet, No Class — and the tabs.

  Class data comes from the Classes module tables (php/api/my_classes.php).
  Group 7 owns Class Feed, Tasks, Activities and Resources; Class List and
  Attendance stay disabled until the Classes module plugs them in.
*/
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import Icon from '../components/Icon'
import NotificationBell from '../components/NotificationBell'
import { ErrorBox, Modal } from '../components/Common'
import { useToast } from '../hooks/useToast'
import { useMyClasses } from '../hooks/useMyClasses'
import { classesApi, postsApi } from '../api/phpApi'
import { initials, roleLabel } from '../utils/format'
import { useAuth } from '../../../auth/AuthProvider'
import logo from '../../../assets/brand/edu-meet-logo.png'
import '../styles/files-blogs.css'

// Closes a pop-out when you click elsewhere or press Escape.
function useOutside(open, setOpen) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])
  return ref
}

export function SideRail() {
  const { pathname } = useLocation()
  const mine = useMyClasses()
  const auth = useAuth()
  const [classesOpen, setClassesOpen] = useState(false)
  const [meOpen, setMeOpen] = useState(false)
  const classesRef = useOutside(classesOpen, setClassesOpen)
  const meRef = useOutside(meOpen, setMeOpen)
  const classes = mine?.response ? mine.body.classes : []
  const me = mine?.response ? mine.body.me : null
  const inClasses = pathname.startsWith('/classes')

  return (
    <aside className="fb-rail" aria-label="Main">
      <Link to="/classes" className="fb-rail__logo" title="EduMeet">
        <img src={logo} alt="EduMeet" />
      </Link>

      <nav className="fb-rail__nav">
        <div className="fb-rail__pop" ref={classesRef}>
          <button
            type="button"
            className={`fb-rail__btn${inClasses ? ' active' : ''}`}
            title="Classes"
            aria-label="Classes"
            aria-expanded={classesOpen}
            onClick={() => setClassesOpen((v) => !v)}
          >
            <Icon name="book" size={22} />
          </button>
          {classesOpen ? (
            <div className="fb-flyout" role="menu">
              <div className="fb-flyout__head">My Classes</div>
              {classes.length ? classes.map((c) => (
                <NavLink key={c.id} role="menuitem" className="fb-flyout__item" to={`/classes/${c.id}/feed`} onClick={() => setClassesOpen(false)}>
                  <b>{c.name}</b>
                  <small>{[c.subject_code, c.schedule].filter(Boolean).join(' · ')}</small>
                </NavLink>
              )) : (
                <div className="fb-flyout__empty">{mine && !mine.response ? mine.message : 'No classes yet.'}</div>
              )}
              <Link className="fb-flyout__all" to="/classes" onClick={() => setClassesOpen(false)}>See all classes <Icon name="chevron" size={14} /></Link>
            </div>
          ) : null}
        </div>
        <NavLink to="/announcements" className="fb-rail__btn" title="Announcements" aria-label="Announcements">
          <Icon name="mega" size={22} />
        </NavLink>
      </nav>

      <div className="fb-rail__bottom">
        <NotificationBell placement="rail" />
        <div className="fb-rail__pop" ref={meRef}>
          <button type="button" className="fb-rail__btn" title="Profile" aria-label="Profile" aria-expanded={meOpen} onClick={() => setMeOpen((v) => !v)}>
            <Icon name="user" size={22} />
          </button>
          {meOpen ? (
            <div className="fb-flyout fb-flyout--up" role="menu">
              <div className="fb-me">
                <span className="fb-avatar">{initials(me?.name)}</span>
                <span>
                  <b>{me?.name || 'Not logged in'}</b>
                  <small>{roleLabel(me?.role)}</small>
                </span>
              </div>
              {auth?.user ? (
                <button type="button" role="menuitem" className="fb-flyout__item fb-flyout__item--row" onClick={() => auth.handleLogout()}>
                  <Icon name="logout" size={16} /> Log out
                </button>
              ) : (
                <Link className="fb-flyout__item fb-flyout__item--row" to="/">
                  <Icon name="logout" size={16} /> Go to login
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

export function FbPage({ children, wide = false }) {
  return (
    <div className="fb fb-shell">
      <SideRail />
      <main className={`fb-main${wide ? ' fb-main--wide' : ''}`}>{children}</main>
    </div>
  )
}

/*
  "No Class" (faculty): posts a "No class today" announcement to the
  Class Feed, which also notifies every student of the class.
*/
function NoClassDialog({ classId, onClose, onDone }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [message, setMessage] = useState(`There will be no class today, ${today}. Please check the Class Feed and Tasks for updates.`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function post() {
    setBusy(true)
    const r = await postsApi.save(classId, null, { title: 'No Class Today', type: 'announcement', message, blocks: [], files: [] })
    setBusy(false)
    if (r.response) onDone(r)
    else setError(r)
  }

  return (
    <Modal
      title="No Class"
      small
      onClose={onClose}
      onSubmit={post}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="fb-btn fb-btn--sm" disabled={busy || !message.trim()}>{busy ? 'Posting…' : 'Post & notify'}</button>
        </>
      }
    >
      <ErrorBox result={error} />
      <p className="fb-muted" style={{ marginBottom: 10 }}>This posts an announcement on the Class Feed and notifies all students of this class.</p>
      <div className="fb-field">
        <label htmlFor="noclass-msg">Message</label>
        <textarea id="noclass-msg" rows={4} value={message} maxLength={5000} onChange={(e) => setMessage(e.target.value)} />
      </div>
    </Modal>
  )
}

const OFF_TABS = ['Class List', 'Attendance'] // Classes module

export function ClassFrame({ classId, className, children }) {
  const [info, setInfo] = useState(null)
  const [noClass, setNoClass] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    let live = true
    classesApi.show(classId).then((r) => { if (live) setInfo(r) })
    return () => { live = false }
  }, [classId])

  const cls = info?.response ? info.body.class : null
  const name = cls?.name || className || 'Class'
  const code = cls ? [cls.id, cls.subject_code].filter(Boolean).join(' - ') : ''
  const schedule = cls?.schedule ? cls.schedule.replace(/^(\S+)\s+/, '$1-') : ''

  return (
    <FbPage>
      <section className="fb-banner">
        <div className="fb-banner__top">
          <h1>{name}</h1>
          {cls ? (
            <div className="fb-banner__meta">
              {code ? <div>{code}</div> : null}
              {schedule ? <div>{schedule}</div> : null}
            </div>
          ) : null}
        </div>
        <div className="fb-banner__row">
          <Link className="fb-pill" to="/classes">
            <Icon name="back" />Back to Classes
          </Link>
          <div className="fb-banner__actions">
            <span className="fb-pill fb-pill--blue" title="Live Conference module">
              <Icon name="video" size={20} />Join Meet
            </span>
            {info?.body?.can_manage ? (
              <button type="button" className="fb-pill fb-pill--ghost" onClick={() => setNoClass(true)}>No Class</button>
            ) : null}
          </div>
        </div>
      </section>
      <nav className="fb-tabs" aria-label="Class">
        <NavLink to={`/classes/${classId}/feed`}>Class Feed</NavLink>
        <NavLink to={`/classes/${classId}/tasks`}>Tasks</NavLink>
        <NavLink to={`/classes/${classId}/activities`}>Activities</NavLink>
        <NavLink to={`/classes/${classId}/resources`}>Resources</NavLink>
        {OFF_TABS.map((t) => <span key={t} className="fb-tabs__off" title="Classes module">{t}</span>)}
      </nav>
      {children}
      {noClass ? (
        <NoClassDialog
          classId={classId}
          onClose={() => setNoClass(false)}
          onDone={(r) => {
            setNoClass(false)
            showToast(`Posted. ${r.body.notified ?? 0} student(s) notified.`)
          }}
        />
      ) : null}
      {toast}
    </FbPage>
  )
}

