export const Chip = ({ c, on, onClick, label }) => (
  <button type="button" className={`chip hx ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick} style={{ background: c.bg, borderColor: c.bd, color: c.fg }}>{label || c.name}</button>
)
