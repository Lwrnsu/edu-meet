/*
  Tasks tab   (route /classes/:classId/tasks)

  Faculty: Task Name · Deadline · "28/29 Submitted" · Active/Closed · edit / delete,
           search and + Add Task.
  Student: Task Name · File Submitted (download / view) · Date Submitted · Score ·
           Pending / Submitted / Missing.
  Click a task name to open it on the Activities tab (details + hand in / grading).
*/
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ClassFrame } from './FbLayout'
import Icon from '../components/Icon'
import { ApiProblem, ConfirmDialog, EmptyState } from '../components/Common'
import TaskForm from '../components/TaskForm'
import { REMARK, StatusPill, SubmittedFile } from '../components/TaskBits'
import { useToast } from '../hooks/useToast'
import { tasksApi } from '../api/phpApi'
import { fmtDate } from '../utils/format'

export default function TasksPage() {
  const { classId } = useParams()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [editing, setEditing] = useState(null)       // null | 'new' | task
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setResult(await tasksApi.list(classId, query))
  }, [classId, query])
  useEffect(() => { load() }, [load])
  // new notification (task posted, score given, work handed in) → refresh the table
  useEffect(() => {
    window.addEventListener('fb:fresh', load)
    return () => window.removeEventListener('fb:fresh', load)
  }, [load])

  const blocked = result && !result.response
  const manage = result?.response && result.body.can_manage
  const tasks = result?.response ? result.body.tasks : []
  const className = result?.response ? result.body.class.name : ''

  async function remove() {
    setBusy(true)
    const r = await tasksApi.remove(deleting.id)
    setBusy(false)
    setDeleting(null)
    showToast(r.message, r.response)
    load()
  }

  return (
    <ClassFrame classId={classId} className={className}>
      {blocked ? (
        <section className="fb-panel"><ApiProblem result={result} backTo="/classes" backLabel="Back to Classes" /></section>
      ) : (
        <>
          <div className="fb-toolbar fb-toolbar--spaced">
            <label className="fb-search">
              <Icon name="search" size={22} />
              <input type="search" placeholder="Search" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            {manage ? (
              <button type="button" className="fb-btn fb-btn--lilac" onClick={() => setEditing('new')}>
                <Icon name="plus" size={22} />Add Task
              </button>
            ) : null}
          </div>

          <section className="fb-table-wrap">
            {!result ? (
              <div className="fb-loading">Loading…</div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon="task"
                title={query ? 'No tasks match your search' : 'No tasks yet'}
                text={query ? 'Try another name.' : manage ? 'Add a task for your students with + Add Task.' : 'Tasks from your teacher will show up here.'}
              />
            ) : manage ? (
              <table className="fb-table">
                <thead>
                  <tr><th>Task Name</th><th>Deadline</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td><Link className="fb-tasklink" to={`/classes/${classId}/activities/${t.id}`}>{t.title}</Link></td>
                      <td>{fmtDate(t.deadline)}</td>
                      <td>{t.submitted_count}/{t.student_count} Submitted</td>
                      <td>
                        <StatusPill status={t.status} />
                      </td>
                      <td>
                        <div className="fb-actions">
                          <button type="button" className="fb-ic fb-ic--edit" title="Edit" aria-label={`Edit ${t.title}`} onClick={() => setEditing(t)}><Icon name="edit" /></button>
                          <button type="button" className="fb-ic fb-ic--del" title="Delete" aria-label={`Delete ${t.title}`} onClick={() => setDeleting(t)}><Icon name="trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="fb-table fb-table--student">
                <thead>
                  <tr><th>Task Name</th><th>File Submitted</th><th>Date Submitted</th><th>Score</th><th>Remarks</th></tr>
                </thead>
                <tbody>
                  {tasks.map((t) => {
                    const s = t.my_submission
                    const [label, cls] = REMARK[t.remark] || REMARK.pending
                    return (
                      <tr key={t.id}>
                        <td><Link className="fb-tasklink" to={`/classes/${classId}/activities/${t.id}`}>{t.title}</Link></td>
                        <td>{s ? <SubmittedFile submission={s} /> : <span className="fb-dash">-</span>}</td>
                        <td>{s ? fmtDate(s.submitted_at) : <span className="fb-dash">-</span>}</td>
                        <td>{s?.score_label || <span className="fb-dash">-</span>}</td>
                        <td>
                          <Link to={`/classes/${classId}/activities/${t.id}`} className={`fb-badge ${cls}`} title="Open task">{label}</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {editing ? (
        <TaskForm
          classId={classId}
          task={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setEditing(null)
            showToast(editing === 'new' ? `Task posted. ${r.body.notified ?? 0} student(s) notified.` : r.message)
            load()
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          text="All handed-in files and scores for this task will be deleted too."
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
      {toast}
    </ClassFrame>
  )
}
