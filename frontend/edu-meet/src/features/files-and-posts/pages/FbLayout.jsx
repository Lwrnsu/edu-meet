/*
  Page frame for the Files & Blogs screens: top bar with the notification
  bell, and (inside a class) the blue class banner with its tabs.

  The class page itself belongs to the Classes module (G8). Group 7 owns
  the Class Feed and Resources tabs; the other tabs are shown disabled
  until G8 plugs them in.
*/
import { Link, NavLink } from 'react-router'
import Icon from '../components/Icon'
import NotificationBell from '../components/NotificationBell'
import '../styles/files-blogs.css'

export function FbPage({ title, children }) {
  return (
    <div className="fb">
      <div className="fb-topbar">
        <span className="fb-topbar__brand">Edu-Meet{title ? <span> · {title}</span> : null}</span>
        <nav className="fb-topbar__links">
          <NavLink to="/announcements">Announcements</NavLink>
        </nav>
        <NotificationBell />
      </div>
      <main className="fb-main">{children}</main>
    </div>
  )
}

const OTHER_TABS = ['Tasks', 'Activities', 'Class List', 'Attendance'] // Classes module (G8)

export function ClassFrame({ classId, className, children }) {
  return (
    <FbPage title={className || 'Class'}>
      <section className="fb-banner">
        <h1>{className || 'Class'}</h1>
        <div className="fb-banner__row">
          <Link className="fb-pill" to="/">
            <Icon name="back" />Back to Classes
          </Link>
          <span className="fb-pill fb-pill--blue" title="Live Conference module">
            <Icon name="video" size={20} />Join Meet
          </span>
        </div>
      </section>
      <nav className="fb-tabs" aria-label="Class">
        <NavLink to={`/classes/${classId}/feed`}>Class Feed</NavLink>
        {OTHER_TABS.slice(0, 2).map((t) => <span key={t} className="fb-tabs__off" title="Classes module">{t}</span>)}
        <NavLink to={`/classes/${classId}/resources`}>Resources</NavLink>
        {OTHER_TABS.slice(2).map((t) => <span key={t} className="fb-tabs__off" title="Classes module">{t}</span>)}
      </nav>
      {children}
    </FbPage>
  )
}
