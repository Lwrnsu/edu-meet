/*
  SCHOOL ANNOUNCEMENTS — dashboard, not tied to one class   (route /announcements[?id=5])

  Students: published announcements meant for them, pinned first, 10 at a time.
  Admins, deans, program chairs, faculty: + Create Announcement → Information
  Details → Target Audience → Post (or Save as draft). Edit, pin, publish,
  archive and delete their own. Who may target whom comes from the server
  (api/announcements.php?action=targets).
*/
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FbPage } from './FbLayout'
import Icon from '../components/Icon'
import FilePicker from '../components/FilePicker'
import { ApiProblem, ConfirmDialog, EmptyState, ErrorBox, FileChip, Modal } from '../components/Common'
import { useToast } from '../hooks/useToast'
import { announcementsApi, fileUrl } from '../api/phpApi'
import { fileProblem, fmtDate, initials } from '../utils/format'

const VIEWS = [
  ['', 'All announcements'],
  ['mine', 'My announcements'],
  ['draft', 'My drafts'],
  ['archived', 'My archived'],
]

const STATUS_LABEL = { draft: 'Draft', published: 'Published', archived: 'Archived' }

export default function AnnouncementsPage() {
  const [params, setParams] = useSearchParams()
  const openId = params.get('id')
  const [view, setView] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [state, setState] = useState(null)
  const [opened, setOpened] = useState(null) // { id, result } for ?id=
  const [modal, setModal] = useState(null) // { kind: 'form' | 'delete', item }
  const [toast, showToast] = useToast()

  const load = useCallback(async (nextPage = 1) => {
    const status = view === 'draft' || view === 'archived' ? view : ''
    const r = await announcementsApi.feed(nextPage, status, view !== '')
    setState(r)
    if (!r.response) return
    setPage(nextPage)
    setItems((prev) => (nextPage === 1 ? r.body.announcements : prev.concat(r.body.announcements)))
  }, [view])

  useEffect(() => { load(1) }, [load])

  const reloadOpened = useCallback(async () => {
    if (!openId) return
    const result = await announcementsApi.show(openId)
    setOpened({ id: openId, result })
  }, [openId])

  useEffect(() => { reloadOpened() }, [reloadOpened])
  // Only show the result that belongs to the id in the address bar.
  const single = opened && opened.id === openId ? opened.result : null

  const done = (message, ok = true) => {
    setModal(null)
    showToast(message, ok)
    load(1)
    reloadOpened()
  }

  const canPost = state?.response && state.body.can_post
  const blocked = state && !state.response
  const actions = {
    onEdit: (item) => setModal({ kind: 'form', item }),
    onDelete: (item) => setModal({ kind: 'delete', item }),
  }

  return (
    <FbPage title="Announcements">
      <div className="fb-page-title">
        <h1>Announcements</h1>
        <p>School-wide news for students, by department, program, year level or section.</p>
      </div>

      {openId ? (
        <section className="fb-panel fb-panel--auto">
          <div className="fb-toolbar">
            <h2>Announcement</h2>
            <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={() => setParams({})}>‹ Back to all</button>
          </div>
          {!single ? (
            <div className="fb-loading">Loading…</div>
          ) : single.response ? (
            <AnnouncementCard item={single.body.announcement} {...actions} />
          ) : (
            <ApiProblem
              result={single.code === 404 ? { ...single, message: 'It may have been deleted, or it isn’t meant for you.' } : single}
              notFoundTitle="Announcement not found"
            />
          )}
        </section>
      ) : null}

      <section className="fb-panel">
        {state && !blocked ? (
          <div className="fb-toolbar">
            <h2>{openId ? 'All announcements' : 'Latest'}</h2>
            {canPost ? (
              <>
                <select value={view} onChange={(e) => setView(e.target.value)} aria-label="Show">
                  {VIEWS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="fb-btn" onClick={() => setModal({ kind: 'form', item: null })}>
                  <Icon name="plus" />Create Announcement
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {!state ? (
          <div className="fb-loading">Loading…</div>
        ) : blocked ? (
          <ApiProblem result={state} />
        ) : items.length === 0 ? (
          view ? (
            <EmptyState icon="mega" title="Nothing here" text="You have no announcements in this list." />
          ) : canPost ? (
            <EmptyState icon="mega" title="No announcements yet" text="Announcements you post will appear here for the students you choose.">
              <button type="button" className="fb-btn fb-btn--sm" onClick={() => setModal({ kind: 'form', item: null })}>
                <Icon name="plus" />Create Announcement
              </button>
            </EmptyState>
          ) : (
            <EmptyState icon="mega" title="No announcements yet" text="School announcements meant for you will appear here." />
          )
        ) : (
          <div className="fb-stack">
            {items.map((item) => <AnnouncementCard key={item.id} item={item} {...actions} />)}
          </div>
        )}
        {state?.response && state.body.has_more ? (
          <div className="fb-more">
            <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={() => load(page + 1)}>Load more</button>
          </div>
        ) : null}
      </section>

      {modal?.kind === 'form' ? <AnnouncementForm item={modal.item} onClose={() => setModal(null)} onDone={done} /> : null}
      {modal?.kind === 'delete' ? (
        <DeleteAnnouncement
          item={modal.item}
          onClose={() => setModal(null)}
          onDone={(message, ok) => {
            if (ok && String(modal.item.id) === openId) setParams({})
            done(message, ok)
          }}
        />
      ) : null}
      {toast}
    </FbPage>
  )
}

function AnnouncementCard({ item: a, onEdit, onDelete }) {
  return (
    <article className={`fb-post${a.is_pinned ? ' fb-post--pinned' : ''}`}>
      <div className="fb-post__top">
        <div className="fb-avatar">{initials(a.author.name)}</div>
        <div className="fb-post__who">
          <Link to={`/announcements?id=${a.id}`} className="fb-link-plain">{a.author.name}</Link>
          <small>{fmtDate(a.published_at || a.created_at, true)} · {a.target_label}</small>
        </div>
        {a.is_pinned ? <span className="fb-type fb-type--pinned"><Icon name="pin" size={14} />Pinned</span> : null}
        {a.status !== 'published' ? <span className={`fb-type fb-type--${a.status}`}>{STATUS_LABEL[a.status]}</span> : null}
        {a.can_edit ? (
          <>
            <button type="button" className="fb-ic fb-ic--edit" title="Edit" aria-label={`Edit ${a.title}`} onClick={() => onEdit(a)}><Icon name="edit" /></button>
            <button type="button" className="fb-ic fb-ic--del" title="Delete" aria-label={`Delete ${a.title}`} onClick={() => onDelete(a)}><Icon name="trash" /></button>
          </>
        ) : null}
      </div>
      <h3>{a.title}</h3>
      <p>{a.body}</p>
      {a.attachment ? (
        <div className="fb-atts">
          <a
            className="fb-att"
            href={fileUrl(a.attachment.viewable ? a.attachment.view_url : a.attachment.download_url)}
            target={a.attachment.viewable ? '_blank' : undefined}
            rel="noreferrer"
          >
            <FileChip type={a.attachment.extension.toUpperCase()} mini />
            {a.attachment.name} · {a.attachment.size_label}
          </a>
        </div>
      ) : null}
    </article>
  )
}

// Create Announcement → Information Details → Target Audience → Post / Save as draft
function AnnouncementForm({ item, onClose, onDone }) {
  const [title, setTitle] = useState(item?.title || '')
  const [body, setBody] = useState(item?.body || '')
  const [targets, setTargets] = useState(item ? item.targets.map((t) => t.token) : [])
  const [pinned, setPinned] = useState(item?.is_pinned || false)
  const [status, setStatus] = useState(item?.status || 'published')
  const [files, setFiles] = useState([])
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    announcementsApi.targets().then((r) => setOptions(r.response ? r.body.options : []))
  }, [])

  // Options grouped for display: [[group, [option…]], …], filtered by the search box.
  const [find, setFind] = useState('')
  const groups = useMemo(() => {
    const words = find.toLowerCase().split(/\s+/).filter(Boolean)
    const map = new Map()
    ;(options || []).forEach((o) => {
      const text = `${o.group} ${o.label}`.toLowerCase()
      if (!words.every((w) => text.includes(w)) && !targets.includes(o.value)) return
      if (!map.has(o.group)) map.set(o.group, [])
      map.get(o.group).push(o)
    })
    return [...map.entries()]
  }, [options, find, targets])

  const labelOf = (token) => options?.find((o) => o.value === token)?.label
    || item?.targets.find((t) => t.token === token)?.label
    || token

  function toggle(token) {
    setTargets(targets.includes(token) ? targets.filter((t) => t !== token) : targets.concat(token))
  }

  async function submit(nextStatus) {
    if (files.length && fileProblem(files[0])) {
      setError({ message: `${files[0].name}: ${fileProblem(files[0])}` })
      return
    }
    setBusy(true)
    const r = await announcementsApi.save(item?.id, {
      title, body, targets, is_pinned: pinned, status: nextStatus, file: files[0], removeAttachment,
    })
    setBusy(false)
    if (!r.response) {
      setError(r)
      return
    }
    onDone(r.message)
  }

  const isNew = !item
  return (
    <Modal
      title={isNew ? 'Create Announcement' : 'Edit Announcement'}
      onClose={onClose}
      onSubmit={() => submit(isNew ? 'published' : status)}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose}>Cancel</button>
          {isNew ? (
            <button type="button" className="fb-btn fb-btn--soft fb-btn--sm" disabled={busy} onClick={() => submit('draft')}>Save as draft</button>
          ) : null}
          <button type="submit" className="fb-btn fb-btn--sm" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Post' : 'Save'}</button>
        </>
      }
    >
      <ErrorBox result={error} />
      <div className="fb-field">
        <label htmlFor="fb-ann-title">Title</label>
        <input id="fb-ann-title" type="text" maxLength={150} placeholder="Enter the title…" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="fb-field">
        <label htmlFor="fb-ann-body">Message</label>
        <textarea id="fb-ann-body" placeholder="Type here…" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="fb-field">
        <span className="fb-label">Target Audience <span className="fb-hint">(choose one or more)</span></span>
        {options === null ? (
          <span className="fb-hint">Loading choices…</span>
        ) : options.length === 0 ? (
          <span className="fb-hint">You have no audiences you can post to.</span>
        ) : (
          <>
          {options.length > 12 ? (
            <label className="fb-search fb-search--block">
              <Icon name="search" />
              <input
                type="search"
                placeholder="Find an audience, e.g. BSCS 2A or CCS"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                aria-label="Find an audience"
              />
            </label>
          ) : null}
          <div className="fb-aud">
            {groups.length === 0 ? <div className="fb-aud__dept fb-hint">No audience matches “{find}”.</div> : null}
            {groups.map(([group, list]) => (
              <div className="fb-aud__dept" key={group}>
                <div className="fb-aud__group">{group}</div>
                <div className="fb-checks">
                  {list.map((o) => (
                    <label key={o.value}>
                      <input type="checkbox" checked={targets.includes(o.value)} onChange={() => toggle(o.value)} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
        <div className="fb-aud__summary">
          Visible to: <b>{targets.length ? targets.map(labelOf).join(', ') : 'nobody yet'}</b>
        </div>
      </div>
      <div className="fb-field fb-field--row">
        <label className="fb-toggle">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <span>Pin to the top</span>
        </label>
        {!isNew ? (
          <label className="fb-inline">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        ) : null}
      </div>
      {item?.attachment && !files.length ? (
        <div className="fb-field">
          <span className="fb-label">Current attachment</span>
          <label className="fb-file-row">
            <FileChip type={item.attachment.extension.toUpperCase()} mini />
            <div className="fb-grow">{item.attachment.name}<small>{item.attachment.size_label}</small></div>
            <input type="checkbox" aria-label="Remove attachment" checked={removeAttachment} onChange={(e) => setRemoveAttachment(e.target.checked)} />
            <span className="fb-hint">Remove</span>
          </label>
        </div>
      ) : null}
      <div className="fb-field">
        <span className="fb-label">{item?.attachment ? 'Replace attachment (optional)' : 'Attachment (optional)'}</span>
        <FilePicker
          files={files}
          onChange={setFiles}
          max={1}
          multiple={false}
          hint="PDF, DOCX, PPTX, XLSX, PNG, JPG, ZIP · max 25 MB · one file"
        />
      </div>
    </Modal>
  )
}

function DeleteAnnouncement({ item, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  return (
    <ConfirmDialog
      title={`Delete “${item.title}”?`}
      text={`Students will no longer see it. This can’t be undone.${item.attachment ? ' It also removes its attachment.' : ''}`}
      busy={busy}
      onClose={onClose}
      onConfirm={async () => {
        setBusy(true)
        const r = await announcementsApi.remove(item.id)
        onDone(r.message, r.response)
      }}
    />
  )
}
