import { I } from './icons.jsx'
import { colors, colorNames } from '../utils/helpers.js'

export const Pill = ({ h, t, onClick }) => <a className="pill" href={h} onClick={onClick}><I n="back" />{t}</a>
export const Head = ({ back, icon, title, sub, children }) => (
  <>
    {back}
    <div className="hd">
      <span className="bi"><I n={icon} /></span>
      <h1>{title}{sub && <span className="sb">{sub}</span>}</h1>
      <div className="acts">{children}</div>
    </div>
  </>
)
export const Fld = ({ id, label, def = '', ph }) => (
  <div className="fld"><label htmlFor={id}>{label}</label><input id={id} name={id} defaultValue={def} placeholder={ph} required /></div>
)
export const Swatches = ({ sel = colors[0], legend = 'Color:' }) => (
  <fieldset className="sw"><legend>{legend}</legend>
    {colors.map((c, i) => (
      <label key={c}><input type="radio" name="color" value={c} defaultChecked={c === sel} /><span style={{ background: c }} /><span className="vh">{colorNames[i]}</span></label>
    ))}
  </fieldset>
)

export function Tile({ kind, o, onDel, onEdit }) {
  const cl = kind === 'cls'
  return (
    <article className={`dc ${cl ? 'cl' : ''}`} style={{ '--c': o.c }}>
      {cl ? (
        <div className="top2">{o.code && <span className="code">{o.code}</span>}<a href={o.h}>{o.t}</a></div>
      ) : (
        <>
          <div className="top2"><I n="tile" x="dki" /></div>
          <a className={`ti ${o.t.length < 18 ? 'big' : ''}`} href={o.h}>{o.t}</a>
        </>
      )}
      <div className="bot">
        <button type="button" className="ib" aria-label={`Delete ${o.t}`} onClick={onDel}><I n="trash" /></button>
        <button type="button" className="ib" aria-label={`Edit ${o.t}`} onClick={onEdit}><I n="edit" /></button>
        <span className="cnt">{o.n}</span>
        <a className="go" href={o.h} aria-label={`Open ${o.t}`}><I n="play" /></a>
      </div>
    </article>
  )
}

export function Shell({ icon, title, sub, ok = 'Save', okCls = '', cancel = 'Cancel', onSubmit, close, children }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.target)) }}>
      <h2><I n={icon} />{title}</h2>
      {sub && <p className="ds">{sub}</p>}
      {children}
      <div className="row"><button type="button" className="btn lt" onClick={close}>{cancel}</button>{ok && <button type="submit" className={`btn ${okCls}`}>{ok}</button>}</div>
    </form>
  )
}
