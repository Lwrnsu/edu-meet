import Switcher from './Switcher.jsx'

/* One header for both apps so the layout never shifts when switching. */
export default function Header({ current, icon, inputId, label, placeholder, q, setQ }) {
  return (
    <header className="top">
      <div className="in">
        <Switcher current={current} icon={icon} />
        {setQ && (
          <div className="search">
            <label className="vh" htmlFor={inputId}>{label}</label>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#1C1C2E" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <input id={inputId} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
          </div>
        )}
      </div>
    </header>
  )
}
