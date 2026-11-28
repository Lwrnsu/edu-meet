/*
  FILE MANAGEMENT — Class → Resources tab   (route /classes/:classId/resources)

  F1  Resources (Student)        F1a empty     F1b no results
  F2  Resources (Faculty)        F2a empty
  F3  Upload modal               errors · uploading progress · success toast
  F4  Edit Resource (rename)
  F5  Delete confirm             success toast
  S1  No access (not enrolled)

  Resources go to everyone enrolled in the class (no target audience).
*/
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ClassFrame } from './FbLayout'
import Icon from '../components/Icon'
import FilePicker from '../components/FilePicker'
import { ApiProblem, ConfirmDialog, EmptyState, ErrorBox, FileChip, Modal } from '../components/Common'
import { useToast } from '../hooks/useToast'
import { fileUrl, resourcesApi } from '../api/phpApi'
import { FILE_TYPE_FILTERS, fileProblem, fmtDate } from '../utils/format'

export default function ResourcesPage() {
  const { classId } = useParams()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [result, setResult] = useState(null)
  const [className, setClassName] = useState('')
  const [modal, setModal] = useState(null) // { kind: 'upload' | 'edit' | 'delete', file }
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    const r = await resourcesApi.list(classId, search.trim(), type)
    setResult(r)
    if (r.response) setClassName(r.body.class?.name || '')
  }, [classId, search, type])

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0) // wait while typing
    return () => clearTimeout(timer)
  }, [load, search])

  const done = (message, ok = true) => {
    setModal(null)
    showToast(message, ok)
    load()
  }

  const canManage = result?.response && result.body.can_manage
  const resources = result?.response ? result.body.resources : []
  const blocked = result && !result.response

  return (
    <ClassFrame classId={classId} className={className}>
      <section className="fb-panel">
        {result && !blocked ? (
          <div className="fb-toolbar">
            <h2>Class Resources</h2>
            <label className="fb-search">
              <Icon name="search" size={20} />
              <input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search resources" />
            </label>
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="File type">
              <option value="">File Type</option>
              {FILE_TYPE_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {canManage ? (
              <button type="button" className="fb-btn" onClick={() => setModal({ kind: 'upload' })}>
                <Icon name="plus" />Upload Resources
              </button>
            ) : null}
          </div>
        ) : null}

        {!result ? (
          <div className="fb-loading">Loading…</div>
        ) : blocked ? (
          <ApiProblem result={result} notFoundTitle="Class not found" backTo="/" backLabel="Back to Classes" />
        ) : resources.length === 0 ? (
          search || type ? (
            <EmptyState icon="missing" title="No matching files" text="No files match your search or filter. Try another word or clear the filter." />
          ) : canManage ? (
            <EmptyState icon="folder" title="No resources yet" text="Upload lecture notes, slides and activity files for your students.">
              <button type="button" className="fb-btn fb-btn--sm" onClick={() => setModal({ kind: 'upload' })}>
                <Icon name="plus" />Upload Resources
              </button>
            </EmptyState>
          ) : (
            <EmptyState icon="folder" title="No resources yet" text="Lecture notes, slides and activity files from your instructor will appear here." />
          )
        ) : (
          <div className="fb-table-wrap">
            <table className="fb-table">
              <thead>
                <tr><th>File Name</th><th>Type</th><th>Size</th><th>Date Uploaded</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td className="fb-table__name">{r.name}</td>
                    <td><FileChip type={r.type} /></td>
                    <td>{r.size_label}</td>
                    <td>{fmtDate(r.uploaded_at)}</td>
                    <td>
                      {canManage ? (
                        <>
                          <Link className="fb-ic fb-ic--view" to={`/classes/${classId}/resources/${r.id}`} state={{ className }} title="View" aria-label={`View ${r.name}`}><Icon name="eye" /></Link>
                          <button type="button" className="fb-ic fb-ic--edit" title="Edit" aria-label={`Rename ${r.name}`} onClick={() => setModal({ kind: 'edit', file: r })}><Icon name="edit" /></button>
                          <button type="button" className="fb-ic fb-ic--del" title="Delete" aria-label={`Delete ${r.name}`} onClick={() => setModal({ kind: 'delete', file: r })}><Icon name="trash" /></button>
                        </>
                      ) : (
                        <span className="fb-row-actions">
                          <Link className="fb-btn fb-btn--sm fb-btn--soft" to={`/classes/${classId}/resources/${r.id}`} state={{ className }}>View</Link>
                          <a className="fb-btn fb-btn--sm" href={fileUrl(r.download_url)}><Icon name="download" />Download</a>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal?.kind === 'upload' ? <UploadModal classId={classId} onClose={() => setModal(null)} onDone={done} /> : null}
      {modal?.kind === 'edit' ? <RenameModal file={modal.file} onClose={() => setModal(null)} onDone={done} /> : null}
      {modal?.kind === 'delete' ? <DeleteResource file={modal.file} onClose={() => setModal(null)} onDone={done} /> : null}
      {toast}
    </ClassFrame>
  )
}

// F3 · Upload Resources (up to 10 files, checked before sending)
function UploadModal({ classId, onClose, onDone }) {
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  async function submit() {
    if (!files.length) {
      setError({ message: 'Choose at least one file to upload.' })
      return
    }
    const bad = files.filter((f) => fileProblem(f)).map((f) => `${f.name}: ${fileProblem(f)}`)
    if (bad.length) {
      setError({ message: 'Some files can’t be uploaded.', body: { errors: bad } })
      return
    }
    setError(null)
    setProgress(0)
    const r = await resourcesApi.upload(classId, files, setProgress)
    setProgress(null)
    if (!r.response) {
      setError(r)
      return
    }
    onDone(r.message)
  }

  const uploading = progress !== null
  return (
    <Modal
      title="Upload Resources"
      onClose={uploading ? () => {} : onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose} disabled={uploading}>Cancel</button>
          <button type="submit" className="fb-btn fb-btn--sm" disabled={uploading}>{uploading ? 'Uploading…' : 'Post'}</button>
        </>
      }
    >
      <ErrorBox result={error} />
      <p className="fb-hint">Files are shared with everyone enrolled in this class.</p>
      <div className="fb-field">
        <span className="fb-label">Files</span>
        <FilePicker
          files={files}
          onChange={setFiles}
          max={10}
          hint="PDF, DOCX, PPTX, XLSX, PNG, JPG, ZIP · max 25 MB each · up to 10 files"
        />
      </div>
      {uploading ? (
        <div>
          <span className="fb-hint">Uploading… {progress}%</span>
          <div className="fb-progress"><div style={{ width: `${progress}%` }} /></div>
        </div>
      ) : null}
    </Modal>
  )
}

// F4 · Edit Resource (rename only)
function RenameModal({ file, onClose, onDone }) {
  const [name, setName] = useState(file.name)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    const r = await resourcesApi.rename(file.id, name)
    setBusy(false)
    if (!r.response) {
      setError(r)
      return
    }
    onDone(r.message)
  }

  return (
    <Modal
      title="Edit Resource"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="fb-btn fb-btn--sm" disabled={busy}>Save</button>
        </>
      }
    >
      <ErrorBox result={error} />
      <div className="fb-field">
        <label htmlFor="fb-rename">File Name</label>
        <input id="fb-rename" type="text" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
    </Modal>
  )
}

// F5 · Delete confirm
function DeleteResource({ file, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  return (
    <ConfirmDialog
      title={`Delete “${file.name}”?`}
      text="Students will no longer see this file. This can’t be undone."
      busy={busy}
      onClose={onClose}
      onConfirm={async () => {
        setBusy(true)
        const r = await resourcesApi.remove(file.id)
        onDone(r.message, r.response)
      }}
    />
  )
}
