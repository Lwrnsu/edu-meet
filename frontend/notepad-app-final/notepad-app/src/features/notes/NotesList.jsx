import { I } from '../../shared/components/icons.jsx'
import { catStyle, pinned, fmtDate } from '../../shared/utils/helpers.js'

// Left sidebar: search box and the list of note cards.
export function NotesList({ notes, shown, edit, q, setQ, onEdit, onTogglePin, onDelete }) {
  return (
    <aside className="side">
      <div className="sq">
        <label className="vh" htmlFor="sq">Search notes</label>
        <span className="sb" aria-hidden="true"><I n="search" /></span>
        <input id="sq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes..." autoComplete="off" />
      </div>
      <h2 className="nc">Notes ({shown.length})</h2>
      <div className={`list ${shown.length ? '' : 'e'}`}>
        {shown.length ? shown.map((n) => (
          <article key={n.id} className={`note ${edit?.id === n.id ? 'sel' : ''}`}>
            <div className="strip" style={{ '--c': catStyle(n.category).top }}>
              <button type="button" className={`ib hx ${pinned(n) ? 'on' : ''}`} aria-label={`${pinned(n) ? 'Unpin' : 'Pin'} ${n.title}`} aria-pressed={pinned(n)} onClick={() => onTogglePin(n)}><I n="pin" /></button>
              <button type="button" className="ib hx" aria-label={`Delete ${n.title}`} onClick={() => onDelete(n.id)}><I n="trash" /></button>
              <button type="button" className="ib hx" aria-label={`Edit ${n.title}`} onClick={() => onEdit(n.id)}><I n="edit" /></button>
            </div>
            <button type="button" className="nb" onClick={() => onEdit(n.id)}>
              <span className="t">{n.title}</span><span className="p">{n.content || ''}</span>
              <span className="d"><I n="clock" />{fmtDate(n.updated_at)}</span>
            </button>
          </article>
        )) : notes ? (
          <div className="none"><I n="notes" /><b>You have no notes yet</b><span>Create your first note</span></div>
        ) : null}
      </div>
    </aside>
  )
}
