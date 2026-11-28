/*
  N1–N3 · Notification bell: unread badge, list, mark as read.
  Checks for new notifications every 30 seconds. Other groups can drop
  <NotificationBell /> into their own header.
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Icon from './Icon'
import { notificationsApi } from '../api/phpApi'
import { notificationRoute, timeAgo } from '../utils/format'

const STYLE = {
  announcement: ['mega', 'fb-n-blue'],
  blog: ['done', 'fb-n-green'],
  resource: ['folder', 'fb-n-purple'],
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unread: 0, notifications: [] })
  const wrap = useRef(null)

  const load = useCallback(async () => {
    const result = await notificationsApi.list()
    if (result.response) setData(result.body)
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

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
    <div className="fb-bell-wrap" ref={wrap}>
      <button
        type="button"
        className="fb-bell"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={20} />
        {unread > 0 ? <span className="fb-bell__dot">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="fb-notif">
          <div className="fb-notif__head">
            Notifications
            {unread > 0 ? <button type="button" onClick={readAll}>Mark all as read</button> : null}
          </div>
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
                  <span className={`fb-notif__ico ${color}`}><Icon name={icon} /></span>
                  <span className="fb-grow">
                    <b>{n.title}</b>
                    {n.message}
                    <small>{timeAgo(n.created_at)}</small>
                  </span>
                  {n.is_read ? null : <span className="fb-notif__unread" />}
                </button>
              )
            })
          ) : (
            <div className="fb-notif__empty">
              <b>You’re all caught up</b>
              New announcements, blogs and resources will show up here.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
