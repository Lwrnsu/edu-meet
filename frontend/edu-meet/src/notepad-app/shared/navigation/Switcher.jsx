import { useEffect, useRef, useState } from 'react'
import { APP_URLS } from './links.js'

const APPS = [{ id: 'reviewer', name: 'Reviewer' }, { id: 'notepad', name: 'Notepad' }]

export default function Switcher({ current, icon }) {
  const [open, setOpen] = useState(false)
  const box = useRef()
  const btn = useRef()
  useEffect(() => {
    if (!open) return
    const down = (e) => { if (!box.current.contains(e.target)) setOpen(false) }
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current.focus() } }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  const name = APPS.find((a) => a.id === current).name
  return (
    <div className="sw2" ref={box}>
      <button ref={btn} type="button" className="logo" aria-haspopup="menu" aria-expanded={open} aria-label={`${name}, switch app`} onClick={() => setOpen(!open)}>
        {icon}<span>{name}</span>
        <svg className="chv" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="#3A3A55" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul className="menu" role="menu">
          {APPS.map((a) => (
            <li key={a.id} role="none">
              <button type="button" role="menuitem" className={a.id === current ? 'cur' : ''} aria-current={a.id === current ? 'true' : undefined} autoFocus={a.id === current}
                onClick={() => { setOpen(false); if (a.id !== current) location.href = APP_URLS[a.id] }}>
                {a.name}
                {a.id === current && <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
