import { useRef, useState } from 'react'
import { api } from '../../shared/api/api.js'
import { I } from '../../shared/components/icons.jsx'
import { Chip } from '../../shared/components/ui.jsx'
import { catStyle, pinned, fmtTime } from '../../shared/utils/helpers.js'

// Create or edit one note: title, body, class, category, pin, save.
export function NoteEditor({ note, cats, classes, onSaved, onCancel, onPin, onError }) {
  const [title, setTitle] = useState(note?.title || '')
  const [body, setBody] = useState(note?.content || '')
  const [cat, setCat] = useState(note?.category || 'General')
  const [classId, setClassId] = useState(note?.class_id ? String(note.class_id) : '')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const last = useRef()
  const run = (cmd) => { last.current?.focus(); document.execCommand(cmd) }
  const allCats = [...new Set(['General', ...cats, cat])]

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title: title.trim() || 'Untitled Note',
      content: body,
      category: cat.trim() || 'General',
      class_id: classId ? Number(classId) : null,
    }
    try {
      const saved = note
        ? await api.notes({ action: 'update', id: note.id, ...payload })
        : await api.notes({ action: 'create', ...payload })
      onSaved(saved)
    } catch (err) {
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ed" aria-label={note ? 'Edit note' : 'New note'}>
      <div className="tb"><h2><I n="doc" />{note ? 'Edit Note' : 'New Note'}</h2><button type="button" className="ib hx" aria-label="Close editor" onClick={onCancel}><I n="x" /></button></div>
      <form className="eb" onSubmit={save}>
        <div className="ur">
          {note && <button type="button" className={`ib hx ${pinned(note) ? 'on' : ''}`} aria-label={pinned(note) ? 'Unpin note' : 'Pin note'} aria-pressed={pinned(note)} onClick={() => onPin(note)}><I n="pin" /></button>}
          <button type="button" className="ib hx" aria-label="Undo" onClick={() => run('undo')}><I n="undo" /></button>
          <button type="button" className="ib hx" aria-label="Redo" onClick={() => run('redo')}><I n="redo" /></button>
        </div>
        <label className="vh" htmlFor="nt">Title</label>
        <input id="nt" className="ti" value={title} onChange={(e) => setTitle(e.target.value)} onFocus={(e) => (last.current = e.target)} placeholder="Enter Title" autoFocus />
        <div className="bw">
          <label className="vh" htmlFor="nb">Note</label>
          <textarea id="nb" className="bd" value={body} onChange={(e) => setBody(e.target.value)} onFocus={(e) => (last.current = e.target)} placeholder="Type your note here..." />
          <button type="button" className="ai" aria-label="AI assistant"><I n="spark" /></button>
        </div>
        <div className="cr" role="group" aria-label="Class">
          <span>Class:</span>
          <select className="cls-sel" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">None</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="cr" role="group" aria-label="Category">
          <span>Category:</span>
          {allCats.map((name) => <Chip key={name} c={{ ...catStyle(name), name }} on={cat === name} onClick={() => setCat(name)} />)}
          {adding ? (
            <>
              <label className="vh" htmlFor="nc">New category name</label>
              <input id="nc" className="chip-in" autoFocus maxLength={80} placeholder="Name"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAdding(false)
                  if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v) setCat(v); setAdding(false) }
                }} onBlur={() => setAdding(false)} />
            </>
          ) : <button type="button" className="chip add hx" onClick={() => setAdding(true)}>+ Add Category</button>}
        </div>
        <div className="ft">
          <span>{note ? `Saved ${fmtTime(note.updated_at)}` : 'Not saved yet'}</span>
          <div className="a"><button type="button" className="lk" onClick={onCancel}>Cancel</button><button type="submit" className="save" disabled={saving}>Save</button></div>
        </div>
      </form>
    </section>
  )
}
