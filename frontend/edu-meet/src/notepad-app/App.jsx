import Header from './shared/navigation/Header.jsx'
import { useRef, useState } from 'react'
import { I } from './shared/components/icons.jsx'
import { pinned } from './shared/utils/helpers.js'
import { useNotesData } from './features/notes/useNotesData.js'
import { NotesList } from './features/notes/NotesList.jsx'
import { FilterChips } from './features/filters/FilterChips.jsx'
import { NoteEditor } from './features/editor/NoteEditor.jsx'
import { DeleteDialog } from './features/delete/DeleteDialog.jsx'

// Page root: holds which note is open, the filter and search text, and the delete target.
export default function App() {
  const { notes, classes, notice, setNotice, upsert, togglePin, removeNote } = useNotesData()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null) // null | { id } | { id: null, k }
  const [del, setDel] = useState(null)   // id of the note waiting for delete confirmation
  const newKey = useRef(0)

  const all = notes || []
  const cats = [...new Set(all.map((n) => n.category))].sort()
  const shown = all.filter((n) =>
    (filter === 'all' || (filter === 'pinned' ? pinned(n) : `c:${n.category}` === filter)) &&
    (n.title + ' ' + (n.content || '')).toLowerCase().includes(q.toLowerCase())
  )
  const cur = edit?.id ? all.find((n) => n.id === edit.id) : null

  const onSaved = (saved) => { upsert(saved); setEdit({ id: saved.id }) }
  const confirmDelete = async () => {
    const ok = await removeNote(del)
    if (ok && edit?.id === del) setEdit(null)
    setDel(null)
  }

  return (
    <div className="np">
      <Header current="notepad" icon={<I n="pad" />} />
      <div className="frame">
        <FilterChips cats={cats} filter={filter} setFilter={setFilter} />
        <div className="app">
          <NotesList notes={notes} shown={shown} edit={edit} q={q} setQ={setQ}
            onEdit={(id) => setEdit({ id })} onTogglePin={togglePin} onDelete={setDel} />
          <main className="main">
            {notice && <p className="np-notice" role="alert">{notice}</p>}
            {edit ? (
              <NoteEditor key={edit.id ?? `new${edit.k}`} note={cur} cats={cats} classes={classes}
                onSaved={onSaved} onCancel={() => setEdit(null)} onPin={togglePin} onError={setNotice} />
            ) : (
              <div className="empty"><I n="noteAdd" /><h2>No notes selected yet</h2><p>Select a note or create a new one</p></div>
            )}
          </main>
        </div>
      </div>
      {!edit && (
        <>
          <button type="button" className="ai f" aria-label="AI assistant"><I n="spark" /></button>
          <button type="button" className="fab" aria-label="Create a new note" onClick={() => setEdit({ id: null, k: ++newKey.current })}><I n="plus" /></button>
        </>
      )}
      <DeleteDialog open={del !== null} onCancel={() => setDel(null)} onConfirm={confirmDelete} />
    </div>
  )
}
