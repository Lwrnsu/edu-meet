/*
  Activities tab
    /classes/:classId/activities           every task as a card
    /classes/:classId/activities/:taskId   one task's details

  Details: instructions, deadline, points, attachment.
  Student: hand in one file (drag & drop), replace or remove it while the
           task is open, then see the score and feedback.
  Faculty: every student's work — download / view, score out of the task's
           points, feedback — plus edit and close / reopen.
*/
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ClassFrame } from './FbLayout'
import Icon from '../components/Icon'
import FilePicker from '../components/FilePicker'
import TaskForm from '../components/TaskForm'
import { ApiProblem, EmptyState, ErrorBox, FileChip } from '../components/Common'
import { RemarkBadge, StatusPill, SubmittedFile } from '../components/TaskBits'
import { useToast } from '../hooks/useToast'
import { fileUrl, tasksApi } from '../api/phpApi'
import { fileProblem, fmtDate } from '../utils/format'

export default function ActivitiesPage() {
  const { classId, taskId } = useParams()
  return taskId ? <TaskDetail classId={classId} taskId={taskId} /> : <ActivityList classId={classId} />
}

// Run fn when the bell gets a new notification (new task, score, hand-in).
function useOnFresh(fn) {
  useEffect(() => {
    window.addEventListener('fb:fresh', fn)
    return () => window.removeEventListener('fb:fresh', fn)
  }, [fn])
}

function ActivityList({ classId }) {
  const [result, setResult] = useState(null)
  const [tick, setTick] = useState(0)
  useOnFresh(useCallback(() => setTick((t) => t + 1), []))
  useEffect(() => {
    let live = true
    tasksApi.list(classId).then((r) => { if (live) setResult(r) })
    return () => { live = false }
  }, [classId, tick])

  const manage = result?.response && result.body.can_manage
  const staff = manage || (result?.response && result.body.can_oversee)
  const tasks = result?.response ? result.body.tasks : []
  return (
    <ClassFrame classId={classId} className={result?.response ? result.body.class.name : ''}>
      {result && !result.response ? (
        <section className="fb-panel"><ApiProblem result={result} backTo="/classes" backLabel="Back to Classes" /></section>
      ) : !result ? (
        <div className="fb-loading">Loading…</div>
      ) : tasks.length === 0 ? (
        <section className="fb-panel">
          <EmptyState icon="activity" title="No activities yet" text={manage ? 'Add a task on the Tasks tab and it will show up here.' : staff ? 'Tasks the teacher adds will show up here.' : 'Tasks from your teacher will show up here.'} />
        </section>
      ) : (
        <div className="fb-act-grid">
          {tasks.map((t) => (
            <Link key={t.id} to={`/classes/${classId}/activities/${t.id}`} className="fb-act-card">
              <div className="fb-act-card__head">
                <span className="fb-act-card__ico"><Icon name="task" size={22} /></span>
                <h3>{t.title}</h3>
                <StatusPill status={t.status} />
              </div>
              <p className="fb-act-card__text">{t.instructions || 'No instructions.'}</p>
              <div className="fb-act-card__foot">
                <span><Icon name="calendar" size={15} />Due {fmtDate(t.deadline, true)}</span>
                <span>{t.max_score} pts</span>
                {staff ? (
                  <span>{t.submitted_count}/{t.student_count} submitted</span>
                ) : (
                  <RemarkBadge remark={t.remark} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </ClassFrame>
  )
}

function TaskDetail({ classId, taskId }) {
  const [result, setResult] = useState(null)
  const [editing, setEditing] = useState(false)
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    setResult(await tasksApi.show(taskId))
  }, [taskId])
  useEffect(() => { load() }, [load])
  useOnFresh(load)

  if (!result) {
    return <ClassFrame classId={classId}><div className="fb-loading">Loading…</div></ClassFrame>
  }
  // a task opened under another class's address is treated as not found
  const wrongClass = result.response && String(result.body.class.id) !== String(classId)
  if (!result.response || wrongClass) {
    return (
      <ClassFrame classId={classId}>
        <section className="fb-panel">
          <ApiProblem result={wrongClass ? { response: false, code: 404, message: 'This task is not in this class.' } : result} notFoundTitle="Task not found" backTo={`/classes/${classId}/activities`} backLabel="Back to Activities" />
        </section>
      </ClassFrame>
    )
  }

  const { task, can_manage: manage, can_oversee: oversee } = result.body
  async function toggleClosed() {
    const r = await tasksApi.setClosed(task.id, task.status === 'active')
    showToast(r.response ? (task.status === 'active' ? 'Task closed.' : 'Task reopened.') : r.message, r.response)
    if (r.response) setResult(r)
  }

  return (
    <ClassFrame classId={classId} className={result.body.class.name}>
      <div className="fb-detail">
        <section className="fb-card fb-task">
          <Link className="fb-back" to={`/classes/${classId}/activities`}><Icon name="back" size={16} />All activities</Link>
          <div className="fb-task__head">
            <h2>{task.title}</h2>
            <StatusPill status={task.status} />
          </div>
          <div className="fb-task__meta">
            <span><Icon name="calendar" size={16} />Due {fmtDate(task.deadline, true)}</span>
            <span>{task.max_score} points</span>
            {task.is_closed ? <span>Closed by teacher</span> : null}
          </div>
          <div className="fb-task__body">{task.instructions || <span className="fb-muted">No instructions.</span>}</div>
          {task.attachment ? (
            <div className="fb-attach">
              <FileChip type={task.attachment.type} mini />
              <span className="fb-grow">{task.attachment.name} <small>{task.attachment.size_label}</small></span>
              {task.attachment.viewable ? (
                <a className="fb-btn fb-btn--sm fb-btn--blue" href={fileUrl(task.attachment.view_url)} target="_blank" rel="noreferrer"><Icon name="eye" size={16} />View</a>
              ) : null}
              <a className="fb-btn fb-btn--sm fb-btn--line" href={fileUrl(task.attachment.download_url)}><Icon name="download" size={16} />Download</a>
            </div>
          ) : null}
          {manage ? (
            <div className="fb-task__tools">
              <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={() => setEditing(true)}><Icon name="edit" size={16} />Edit task</button>
              <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={toggleClosed}>
                <Icon name={task.status === 'active' ? 'lock' : 'done'} size={16} />{task.status === 'active' ? 'Close task' : 'Reopen task'}
              </button>
            </div>
          ) : null}
        </section>

        {manage || oversee ? (
          <Submissions data={result.body} readOnly={!manage} onGraded={showToast} reload={load} />
        ) : (
          <MyWork data={result.body} onChange={(r, message) => { setResult(r); showToast(message) }} showToast={showToast} />
        )}
      </div>

      {editing ? (
        <TaskForm classId={classId} task={task} onClose={() => setEditing(false)} onSaved={(r) => { setEditing(false); setResult(r); showToast('Task updated.') }} />
      ) : null}
      {toast}
    </ClassFrame>
  )
}

// ---------- student ----------

function MyWork({ data, onChange, showToast }) {
  const { task, my_submission: mine, remark } = data
  const open = task.status === 'active'
  const [files, setFiles] = useState([])
  const [replacing, setReplacing] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  async function handIn() {
    if (!files.length) {
      setError({ message: 'Choose a file to hand in.' })
      return
    }
    if (fileProblem(files[0])) {
      setError({ message: `${files[0].name}: ${fileProblem(files[0])}.` })
      return
    }
    setError(null)
    setProgress(0)
    const r = await tasksApi.submit(task.id, files[0], setProgress)
    setProgress(null)
    if (!r.response) {
      setError(r)
      return
    }
    setFiles([])
    setReplacing(false)
    onChange(r, r.message)
  }

  async function unsubmit() {
    const r = await tasksApi.unsubmit(task.id)
    if (r.response) onChange(r, r.message)
    else showToast(r.message, false)
  }

  const showPicker = open && (!mine || replacing) && !(mine && mine.score !== null)
  return (
    <aside className="fb-card fb-mywork">
      <div className="fb-mywork__head">
        <h3>Your work</h3>
        <RemarkBadge remark={remark} />
      </div>

      {mine ? (
        <>
          <SubmittedFile submission={mine} />
          <p className="fb-muted fb-small">
            Handed in {fmtDate(mine.submitted_at, true)}{mine.is_late ? ' · late' : ''}
          </p>
          {mine.score_label ? (
            <div className="fb-grade">
              <span>Score</span>
              <b>{mine.score_label}</b>
              {mine.feedback ? <p>“{mine.feedback}”</p> : null}
            </div>
          ) : (
            <p className="fb-muted fb-small">Not graded yet.</p>
          )}
        </>
      ) : !open ? (
        <p className="fb-muted">This task is closed. Work can no longer be handed in.</p>
      ) : null}

      <ErrorBox result={error} />
      {showPicker ? (
        <>
          <FilePicker files={files} onChange={(f) => { setFiles(f); setError(null) }} max={1} multiple={false} hint="One file, up to 25 MB. Put several files in a ZIP." />
          {progress !== null ? (
            <div className="fb-progress" aria-label="Upload progress"><span style={{ width: `${progress}%` }} /></div>
          ) : null}
          <div className="fb-mywork__btns">
            {replacing ? <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={() => { setReplacing(false); setFiles([]) }}>Cancel</button> : null}
            <button type="button" className="fb-btn fb-btn--sm" disabled={progress !== null} onClick={handIn}>
              {progress !== null ? `Uploading… ${progress}%` : replacing ? 'Replace file' : 'Hand in'}
            </button>
          </div>
        </>
      ) : open && mine && mine.score === null ? (
        <div className="fb-mywork__btns">
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={unsubmit}>Remove</button>
          <button type="button" className="fb-btn fb-btn--sm" onClick={() => setReplacing(true)}>Replace file</button>
        </div>
      ) : null}
    </aside>
  )
}

// ---------- faculty ----------

const FILTERS = [
  ['all', 'All students'],
  ['submitted', 'Handed in'],
  ['ungraded', 'Needs grading'],
  ['none', 'Not handed in'],
]

function Submissions({ data, readOnly, onGraded, reload }) {
  const [filter, setFilter] = useState('all')
  const rows = data.submissions.filter((r) => {
    if (filter === 'submitted') return r.submission
    if (filter === 'ungraded') return r.submission && r.submission.score === null
    if (filter === 'none') return !r.submission
    return true
  })
  return (
    <section className="fb-card fb-subs">
      <div className="fb-subs__head">
        <h3>Submissions <span className="fb-muted">{data.submitted_count}/{data.student_count} handed in</span></h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
          {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {data.student_count === 0 ? (
        <EmptyState icon="user" title="No students yet" text="Students of this class will be listed here." />
      ) : rows.length === 0 ? (
        <p className="fb-muted fb-pad">Nobody here.</p>
      ) : (
        <div className="fb-table-scroll">
          <table className="fb-table fb-table--subs">
            <thead>
              <tr><th>Student</th><th>File Submitted</th><th>Date Submitted</th><th>Score</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student.id}>
                  <td><b className="fb-strong">{r.student.name}</b>{r.student.section ? <small className="fb-block fb-muted">{r.student.section}</small> : null}</td>
                  <td>{r.submission ? <SubmittedFile submission={r.submission} /> : <span className="fb-dash">-</span>}</td>
                  <td>{r.submission ? <>{fmtDate(r.submission.submitted_at)}{r.submission.is_late ? <small className="fb-late"> late</small> : null}</> : <span className="fb-dash">-</span>}</td>
                  <td>{r.submission && readOnly ? (r.submission.score_label || <span className="fb-muted">Not graded</span>) : r.submission ? <GradeCell submission={r.submission} max={data.task.max_score} onSaved={(m) => { onGraded(m); reload() }} onError={(m) => onGraded(m, false)} /> : <span className="fb-dash">-</span>}</td>
                  <td><RemarkBadge remark={r.remark} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function GradeCell({ submission, max, onSaved, onError }) {
  const [score, setScore] = useState(submission.score ?? '')
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [busy, setBusy] = useState(false)
  const changed = String(score) !== String(submission.score ?? '') || feedback !== (submission.feedback ?? '')

  async function save() {
    const n = Number(score)
    if (score === '' || Number.isNaN(n) || n < 0 || n > max) {
      onError(`Score must be a number from 0 to ${max}.`)
      return
    }
    setBusy(true)
    const r = await tasksApi.grade(submission.id, n, feedback)
    setBusy(false)
    if (r.response) onSaved('Score saved. The student was notified.')
    else onError(r.message)
  }

  return (
    <form className="fb-gradecell" onSubmit={(e) => { e.preventDefault(); save() }}>
      <span className="fb-gradecell__score">
        <input type="number" min={0} max={max} step="0.5" value={score} onChange={(e) => setScore(e.target.value)} aria-label="Score" />
        <span>/{max}</span>
      </span>
      <input type="text" className="fb-gradecell__fb" placeholder="Feedback (optional)" maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} aria-label="Feedback" />
      <button type="submit" className="fb-btn fb-btn--sm" disabled={busy || !changed}>{busy ? '…' : 'Save'}</button>
    </form>
  )
}
