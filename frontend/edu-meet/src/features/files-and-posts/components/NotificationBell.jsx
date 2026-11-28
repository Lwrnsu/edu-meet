/*
  N1–N3 · Notifications: the bell (unread badge + list) and in-app alerts.

  - Checks for new notifications every 20 seconds (and when the tab is shown again).
  - Anything new since the last check pops up as an alert in the corner
    (click it to open; it hides itself after a few seconds).
  - The list shows Read / Unread; opening an item marks it read and goes to its page.

  Other groups can drop <NotificationBell /> into their own sidebar or header.
  placement="rail" opens the list beside a left sidebar; "top" opens it below.
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Icon from './Icon'
import { notificationsApi } from '../api/phpApi'
import { fmtDate, notificationRoute } from '../utils/format'

const STYLE = {
  announcement: ['mega', 'fb-n-blue'],
  blog: ['done', 'fb-n-green'],
  resource: ['folder', 'fb-n-purple'],
  task: ['task', 'fb-n-purple'],
  grade: ['done', 'fb-n-green'],
  submission: ['upload', 'fb-n-blue'],
}
const POLL_MS = 20000
const ALERT_MS = 7000

export default function NotificationBell({ placement = 'rail' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unread: 0, notifications: [] })
  const [alerts, setAlerts] = useState([])
  const wrap = useRef(null)
  const lastSeenId = useRef(null)   // newest id already known; null until the first load

  const load = useCallback(async () => {
    const result = await notificationsApi.list()
    if (!result.response) return
    const list = result.body.notifications || []
    const newest = list.reduce((m, n) => Math.max(m, n.id), 0)
    if (lastSeenId.current !== null) {
      const fresh = list.filter((n) => n.id > lastSeenId.current && !n.is_read).slice(0, 3)
      if (fresh.length) {
        setAlerts((a) => [...fresh.reverse(), ...a].slice(0, 3))
        // let the open page reload its data (new task, new score, …)
        window.dispatchEvent(new CustomEvent('fb:fresh', { detail: fresh }))
      }
    }
    lastSeenId.current = Math.max(lastSeenId.current ?? 0, newest)
    setData(result.body)
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    const onShow = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onShow)
    // pages fire this after something changed read state (e.g. opening an announcement)
    window.addEventListener('fb:notifications', load)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('fb:notifications', load)
    }
  }, [load])

  // alerts hide themselves
  useEffect(() => {
    if (!alerts.length) return undefined
    const t = setTimeout(() => setAlerts((a) => a.slice(0, -1)), ALERT_MS)
    return () => clearTimeout(t)
  }, [alerts])

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function openItem(n) {
    if (!n.is_read) await notificationsApi.read(n.id)
    setOpen(false)
    setAlerts((a) => a.filter((x) => x.id !== n.id))
    load()
    const route = notificationRoute(n.link)
    if (route) navigate(route)
  }

  async function readAll() {
    await notificationsApi.readAll()
    load()
  }

  const { unread, notifications } = data
  return (
    <>
      <div className={`fb-bell-wrap fb-bell-wrap--${placement}`} ref={wrap}>
        <button
          type="button"
          className="fb-bell"
          title="Notifications"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="bell" size={22} />
          {unread > 0 ? <span className="fb-bell__dot">{unread > 99 ? '99+' : unread}</span> : null}
        </button>
        {open ? (
          <div className="fb-notif" role="dialog" aria-label="Notifications">
            <div className="fb-notif__head">
              <span>Notifications</span>
              {unread > 0 ? <span className="fb-notif__count">{unread} unread</span> : null}
            </div>
            <div className="fb-notif__list">
              {notifications.length ? (
                notifications.map((n) => {
                  const [icon, color] = STYLE[n.type] || STYLE.announcement
                  return (
                    <button
                      type="button"
                      key={n.id}
                      className={`fb-notif__item${n.is_read ? '' : ' fb-notif__item--unread'}`}
                      onClick={() => openItem(n)}
                    >
                      <span className={`fb-notif__ico ${color}`}><Icon name={icon} size={16} /></span>
                      <span className="fb-grow">
                        <b>{n.message.split(' · ')[0]}</b>
                        <small>{fmtDate(n.created_at, true)} • {n.is_read ? 'Read' : 'Unread'}</small>
                        <span className="fb-notif__what">{n.title}{n.message.includes(' · ') ? ` · ${n.message.split(' · ').slice(1).join(' · ')}` : ''}</span>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="fb-notif__empty">
                  <b>You’re all caught up</b>
                  New announcements, tasks, grades and resources will show up here.
                </div>
              )}
            </div>
            {unread > 0 ? (
              <button type="button" className="fb-notif__all" onClick={readAll}>Mark all as read</button>
            ) : null}
          </div>
        ) : null}
      </div>

      {alerts.length ? (
        <div className="fb-alerts" aria-live="polite">
          {alerts.map((n) => {
            const [icon, color] = STYLE[n.type] || STYLE.announcement
            return (
              <div key={n.id} className="fb-alert" role="status">
                <button type="button" className="fb-alert__open" onClick={() => openItem(n)}>
                  <span className={`fb-notif__ico ${color}`}><Icon name={icon} size={16} /></span>
                  <span className="fb-grow">
                    <b>{n.title}</b>
                    <span>{n.message}</span>
                  </span>
                </button>
                <button type="button" className="fb-alert__x" aria-label="Dismiss" onClick={() => setAlerts((a) => a.filter((x) => x.id !== n.id))}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
