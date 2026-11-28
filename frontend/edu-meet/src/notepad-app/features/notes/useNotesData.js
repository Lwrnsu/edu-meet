import { useEffect, useState } from 'react'
import { api } from '../../shared/api/api.js'
import { sortNotes } from '../../shared/utils/helpers.js'

// Loads the notes and the class list, and saves changes through the API.
export function useNotesData() {
  const [notes, setNotes] = useState(null)
  const [classes, setClasses] = useState([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.notesList().then((list) => setNotes(sortNotes(list))).catch((e) => { setNotice(e.message); setNotes([]) })
    api.tree().then((t) => setClasses(t.map((c) => ({ id: c.id, name: c.name })))).catch(() => {})
  }, [])

  // Adds a new note or replaces an edited one, keeping the server's sort order.
  const upsert = (saved) => {
    setNotes((ns) => sortNotes([saved, ...(ns || []).filter((n) => n.id !== saved.id)]))
    setNotice('')
  }
  const replace = (saved) => setNotes((ns) => sortNotes((ns || []).map((n) => (n.id === saved.id ? saved : n))))

  const togglePin = async (note) => {
    try { replace(await api.notes({ action: 'togglePin', id: note.id })) } catch (e) { setNotice(e.message) }
  }

  // Returns true when the note was deleted.
  const removeNote = async (id) => {
    try {
      await api.notes({ action: 'delete', id })
      setNotes((ns) => (ns || []).filter((n) => n.id !== id))
      setNotice('')
      return true
    } catch (e) {
      setNotice(e.message)
      return false
    }
  }

  return { notes, classes, notice, setNotice, upsert, togglePin, removeNote }
}
