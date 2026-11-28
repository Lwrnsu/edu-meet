import { useEffect, useRef } from 'react'
import { I } from '../../shared/components/icons.jsx'

// Confirmation popup for deleting a note. `open` is true while a note is waiting to be deleted.
export function DeleteDialog({ open, onCancel, onConfirm }) {
  const dlg = useRef()
  useEffect(() => {
    const d = dlg.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={dlg} onClose={onCancel}>
      <h2><I n="trash" />Delete this note?</h2>
      <p className="ds">This note will be removed from the notes list</p>
      <div className="row"><button type="button" className="btn" onClick={onCancel}>Keep it</button><button type="button" className="btn red" onClick={onConfirm}>Delete</button></div>
    </dialog>
  )
}
