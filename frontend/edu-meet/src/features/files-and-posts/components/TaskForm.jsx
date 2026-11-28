/*
  Add Task / Edit Task pop-up (faculty).
  Task name, instructions, deadline, points, optional attachment;
  when editing, "Accept submissions" closes or reopens the task.
*/
import { useState } from 'react'
import { Modal, ErrorBox } from './Common'
import FilePicker from './FilePicker'
import Icon from './Icon'
import { tasksApi } from '../api/phpApi'
import { defaultDeadline, fileProblem, toInputDateTime } from '../utils/format'

export default function TaskForm({ classId, task, onClose, onSaved }) {
  const editing = Boolean(task)
  const [title, setTitle] = useState(task?.title || '')
  const [instructions, setInstructions] = useState(task?.instructions || '')
  const [deadline, setDeadline] = useState(editing ? toInputDateTime(task.deadline) : defaultDeadline())
  const [maxScore, setMaxScore] = useState(String(task?.max_score ?? 100))
  const [open, setOpen] = useState(editing ? !task.is_closed : true)
  const [files, setFiles] = useState([])
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)

  function check() {
    const e = {}
    if (!title.trim()) e.title = 'Task name is required.'
    if (!deadline) e.deadline = 'Deadline is required.'
    else if (!editing && new Date(deadline) <= new Date()) e.deadline = 'Deadline must be in the future.'
    const n = Number(maxScore)
    if (!Number.isInteger(n) || n < 1 || n > 1000) e.max_score = 'Points must be a whole number from 1 to 1000.'
    if (files.some((f) => fileProblem(f))) e.file = 'Remove the file marked with a problem.'
    return e
  }

  async function save() {
    const e = check()
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const r = await tasksApi.save(classId, task?.id, {
      title: title.trim(),
      instructions,
      deadline,
      max_score: maxScore,
      is_closed: editing ? !open : undefined,
      file: files[0],
      removeAttachment,
    })
    setBusy(false)
    if (r.response) onSaved(r)
    else setServerError(r)
  }

  const field = (key, setter) => (ev) => {
    setter(ev.target.value)
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  return (
    <Modal
      title={editing ? 'Edit Task' : 'Add Task'}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="fb-btn fb-btn--sm" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Post Task'}</button>
        </>
      }
    >
      <ErrorBox result={serverError} />
      <div className="fb-field">
        <label htmlFor="task-title">Task Name*</label>
        <input id="task-title" type="text" maxLength={150} value={title} onChange={field('title', setTitle)} aria-invalid={Boolean(errors.title)} />
        {errors.title ? <div className="fb-field__err">{errors.title}</div> : null}
      </div>
      <div className="fb-field">
        <label htmlFor="task-instr">Instructions</label>
        <textarea id="task-instr" rows={5} maxLength={5000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="What should students do and hand in?" />
      </div>
      <div className="fb-field-grid">
        <div className="fb-field">
          <label htmlFor="task-deadline">Deadline*</label>
          <input id="task-deadline" type="datetime-local" value={deadline} onChange={field('deadline', setDeadline)} aria-invalid={Boolean(errors.deadline)} />
          {errors.deadline ? <div className="fb-field__err">{errors.deadline}</div> : null}
        </div>
        <div className="fb-field">
          <label htmlFor="task-points">Points*</label>
          <input id="task-points" type="number" min={1} max={1000} step={1} value={maxScore} onChange={field('max_score', setMaxScore)} aria-invalid={Boolean(errors.max_score)} />
          {errors.max_score ? <div className="fb-field__err">{errors.max_score}</div> : null}
        </div>
      </div>
      {editing ? (
        <label className="fb-check">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          Accept submissions (untick to close the task now)
        </label>
      ) : null}
      <div className="fb-field">
        <span className="fb-label">Attachment (optional)</span>
        {editing && task.attachment && !removeAttachment && !files.length ? (
          <div className="fb-current-file">
            <Icon name="clip" size={16} /> {task.attachment.name}
            <button type="button" className="fb-link" onClick={() => setRemoveAttachment(true)}>Remove</button>
          </div>
        ) : null}
        <FilePicker files={files} onChange={(f) => { setFiles(f); setErrors((x) => ({ ...x, file: undefined })) }} max={1} multiple={false} hint="One file, up to 25 MB" />
        {errors.file ? <div className="fb-field__err">{errors.file}</div> : null}
      </div>
    </Modal>
  )
}
