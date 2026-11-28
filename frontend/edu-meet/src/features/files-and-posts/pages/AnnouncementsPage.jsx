/*
  SCHOOL ANNOUNCEMENTS   (route /announcements[?id=5])

  Purple header with + New Announcement (admins, deans, program chairs, faculty).
  Left: announcement cards (title · Posted by · Posted date · Read ›), pinned first.
  Right: the opened announcement — rich text, attachment View / Download,
         and edit / delete for the author.
  Opening one marks its bell notification as read.
  Who may target whom comes from the server (api/announcements.php?action=targets).
*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { FbPage } from './FbLayout'
import Icon from '../components/Icon'
import FilePicker from '../components/FilePicker'
import RichTextEditor, { isEmptyHtml } from '../components/RichTextEditor'
import { ApiProblem, ConfirmDialog, EmptyState, ErrorBox, FileChip, Modal } from '../components/Common'
import { useToast } from '../hooks/useToast'
import { announcementsApi, fileUrl } from '../api/phpApi'
import { fileProblem, fmtDate, roleLabel } from '../utils/format'

const VIEWS = [
  ['', 'All announcements'],
  ['mine', 'My announcements'],
  ['draft', 'My drafts'],
  ['archived', 'My archived'],
]

const STATUS_LABEL = { draft: 'Draft', published: 'Published', archived: 'Archived' }
const PREVIEW = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp']

export default function AnnouncementsPage() {
  const [params, setParams] = useSearchParams()
  const openId = params.get('id')
  const [view, setView] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [state, setState] = useState(null)
  const [opened, setOpened] = useState(null) // { id, result }
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
  // a new notification arrived (e.g. a new announcement) → refresh the list
  useEffect(() => {
    const refresh = () => load(1)
    window.addEventListener('fb:fresh', refresh)
    return () => window.removeEventListener('fb:fresh', refresh)
  }, [load])

  // With no ?id=, open the first one on wide screens.
  const firstId = items[0]?.id
  const autoOpen = !openId && firstId && window.matchMedia('(min-width: 900px)').matches ? String(firstId) : null
  const showId = openId || autoOpen

  const reloadOpened = useCallback(async () => {
    if (!showId) return
    const result = await announcementsApi.show(showId)
    setOpened({ id: showId, result })
    window.dispatchEvent(new Event('fb:notifications'))
  }, [showId])

  useEffect(() => { reloadOpened() }, [reloadOpened])
  const single = opened && opened.id === showId ? opened.result : null

  const done = (message, ok = true) => {
    setModal(null)
    showToast(message, ok)
    load(1)
    reloadOpened()
  }

  const canPost = state?.response && state.body.can_post
  const blocked = state && !state.response
  const openItem = (id) => setParams({ id: String(id) })
  const newAnnouncement = () => setModal({ kind: 'form', item: null })

  return (
    <FbPage wide>
      <header className="fb-hero">
        <div>
          <h1>Announcements</h1>
          <p>School news for students, by department, program, year level or section.</p>
        </div>
        {canPost ? (
          <button type="button" className="fb-hero__btn" onClick={newAnnouncement}>
            <Icon name="plus" />New Announcement
          </button>
        ) : null}
      </header>

      {!state ? (
        <div className="fb-loading">Loading…</div>
      ) : blocked ? (
        <section className="fb-panel"><ApiProblem result={state} /></section>
      ) : (
        <div className={`fb-ann${openId ? ' fb-ann--reading' : ''}`}>
          <section className="fb-ann__list" aria-label="Announcements">
            {canPost ? (
              <select className="fb-ann__view" value={view} onChange={(e) => setView(e.target.value)} aria-label="Show">
                {VIEWS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            ) : null}
            {items.length === 0 ? (
              <div className="fb-panel">
                {view ? (
                  <EmptyState icon="mega" title="Nothing here" text="You have no announcements in this list." />
                ) : canPost ? (
                  <EmptyState icon="mega" title="No announcements yet" text="Announcements you post will appear here for the students you choose.">
                    <button type="button" className="fb-btn fb-btn--sm" onClick={newAnnouncement}><Icon name="plus" />New Announcement</button>
                  </EmptyState>
                ) : (
                  <EmptyState icon="mega" title="No announcements yet" text="School announcements meant for you will appear here." />
                )}
              </div>
            ) : (
              items.map((a) => (
                <AnnouncementItem key={a.id} item={a} active={String(a.id) === showId} showTarget={canPost} onOpen={() => openItem(a.id)} />
              ))
            )}
            {state.body.has_more ? (
              <div className="fb-more">
                <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={() => load(page + 1)}>Load more</button>
              </div>
            ) : null}
          </section>

          <section className="fb-ann__read" aria-live="polite">
            {openId ? (
              <button type="button" className="fb-back fb-ann__back" onClick={() => setParams({})}>
                <Icon name="back" size={16} />All announcements
              </button>
            ) : null}
            {!showId ? (
              items.length ? <div className="fb-ann__hint">Pick an announcement to read it.</div> : null
            ) : !single ? (
              <div className="fb-loading">Loading…</div>
            ) : single.response ? (
              <AnnouncementDetail
                item={single.body.announcement}
                onEdit={(item) => setModal({ kind: 'form', item })}
                onDelete={(item) => setModal({ kind: 'delete', item })}
              />
            ) : (
              <ApiProblem
                result={single.code === 404 ? { ...single, message: 'It may have been deleted, or it isn’t meant for you.' } : single}
                notFoundTitle="Announcement not found"
              />
            )}
          </section>
        </div>
      )}

      {modal?.kind === 'form' ? <AnnouncementForm item={modal.item} onClose={() => setModal(null)} onDone={done} /> : null}
      {modal?.kind === 'delete' ? (
        <DeleteAnnouncement
          item={modal.item}
          onClose={() => setModal(null)}
          onDone={(message, ok) => {
            if (ok) setParams({})
            done(message, ok)
          }}
        />
      ) : null}
      {toast}
    </FbPage>
  )
}

function postedBy(a) {
  const role = roleLabel(a.author.role)
  return role ? `${a.author.name} (${role})` : a.author.name
}

function AnnouncementItem({ item: a, active, showTarget, onOpen }) {
  return (
    <article className={`fb-ann-card${active ? ' is-active' : ''}${a.is_pinned ? ' is-pinned' : ''}`}>
      <div className="fb-ann-card__tags">
        {a.is_pinned ? <span className="fb-type fb-type--pinned"><Icon name="pin" size={13} />Pinned</span> : null}
        {a.status !== 'published' ? <span className={`fb-type fb-type--${a.status}`}>{STATUS_LABEL[a.status]}</span> : null}
        {showTarget ? <span className="fb-target">Target: {a.target_label}</span> : null}
      </div>
      <h2>{a.title}</h2>
      <p className="fb-ann-card__by">Posted by {a.author.name}</p>
      <div className="fb-ann-card__foot">
        <span><Icon name="calendar" size={15} />Posted: {fmtDate(a.published_at || a.created_at)}</span>
        <button type="button" className="fb-ann-card__read" onClick={onOpen} aria-label={`Read ${a.title}`}>
          Read <Icon name="chevron" size={15} />
        </button>
      </div>
    </article>
  )
}

function AnnouncementDetail({ item: a, onEdit, onDelete }) {
  const [preview, setPreview] = useState(false)
  const att = a.attachment
  const canPreview = att && PREVIEW.includes(att.extension.toLowerCase())

  return (
    <article className="fb-ann-detail">
      <div className="fb-ann-detail__top">
        <div className="fb-ann-card__tags">
          {a.is_pinned ? <span className="fb-type fb-type--pinned"><Icon name="pin" size={13} />Pinned</span> : null}
          {a.status !== 'published' ? <span className={`fb-type fb-type--${a.status}`}>{STATUS_LABEL[a.status]}</span> : null}
        </div>
        <time>{fmtDate(a.published_at || a.created_at, true)}</time>
      </div>
      <h2>{a.title}</h2>
      <p className="fb-ann-detail__by">Posted by {postedBy(a)}</p>
      {a.can_edit ? (
        <div className="fb-ann-detail__tools">
          <span className="fb-target">Target: {a.target_label}</span>
          <button type="button" className="fb-ic fb-ic--edit" title="Edit" aria-label={`Edit ${a.title}`} onClick={() => onEdit(a)}><Icon name="edit" /></button>
          <button type="button" className="fb-ic fb-ic--del" title="Delete" aria-label={`Delete ${a.title}`} onClick={() => onDelete(a)}><Icon name="trash" /></button>
        </div>
      ) : null}
      {/* body_html is cleaned by the server (php/helpers/RichText.php) */}
      <div className="fb-rich" dangerouslySetInnerHTML={{ __html: a.body_html }} />

      {att ? (
        <>
          <div className="fb-ann-att">
            <FileChip type={att.extension.toUpperCase()} mini />
            <div className="fb-grow">
              <span className="fb-strong">{att.name}</span>
              <small>{att.size_label}</small>
            </div>
            {att.viewable ? (
              canPreview ? (
                <button type="button" className="fb-btn fb-btn--blue fb-btn--sm" onClick={() => setPreview((p) => !p)}>
                  <Icon name="eye" size={16} />{preview ? 'Hide' : 'View'}
                </button>
              ) : (
                <a className="fb-btn fb-btn--blue fb-btn--sm" href={fileUrl(att.view_url)} target="_blank" rel="noreferrer">
                  <Icon name="eye" size={16} />View
                </a>
              )
            ) : null}
            <a className="fb-btn fb-btn--line fb-btn--sm" href={fileUrl(att.download_url)}>
              <Icon name="download" size={16} />Download
            </a>
          </div>
          {preview ? (
            att.extension.toLowerCase() === 'pdf' ? (
              <iframe className="fb-ann-preview" title={att.name} src={fileUrl(att.view_url)} />
            ) : (
              <img className="fb-ann-preview fb-ann-preview--img" alt={att.name} src={fileUrl(att.view_url)} />
            )
          ) : null}
        </>
      ) : null}
    </article>
  )
}

// Target Audience: chips of the chosen audiences + a searchable dropdown.
function AudiencePicker({ options, value, onChange, labelOf, invalid }) {
  const [open, setOpen] = useState(false)
  const [find, setFind] = useState('')
  const wrap = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc, true)
    }
  }, [open])

  const groups = useMemo(() => {
    const words = find.toLowerCase().split(/\s+/).filter(Boolean)
    const map = new Map()
    options.forEach((o) => {
      const text = `${o.group} ${o.label}`.toLowerCase()
      if (!words.every((w) => text.includes(w))) return
      if (!map.has(o.group)) map.set(o.group, [])
      map.get(o.group).push(o)
    })
    return [...map.entries()]
  }, [options, find])

  const toggle = (token) => onChange(value.includes(token) ? value.filter((t) => t !== token) : value.concat(token))

  return (
    <div
      className="fb-aud-pick"
      ref={wrap}
      onBlur={(e) => { if (!wrap.current.contains(e.relatedTarget)) { setOpen(false); setFind('') } }}
    >
      <div
        className={`fb-chips${invalid ? ' fb-chips--invalid' : ''}`}
        onClick={() => setOpen(true)}
        role="presentation"
      >
        {value.map((t) => (
          <span key={t} className="fb-audchip">
            {labelOf(t)}
            <button type="button" aria-label={`Remove ${labelOf(t)}`} onClick={(e) => { e.stopPropagation(); toggle(t) }}>×</button>
          </span>
        ))}
        <input
          id="fb-ann-aud"
          type="text"
          placeholder={value.length ? 'Add more…' : 'Choose who will see it…'}
          value={find}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setFind(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !find && value.length) toggle(value[value.length - 1])
            if (e.key === 'Enter') e.preventDefault()
          }}
          aria-expanded={open}
          aria-controls="fb-aud-menu"
          autoComplete="off"
        />
        <Icon name="chevron" size={16} />
      </div>
      {open ? (
        <div className="fb-aud-menu" id="fb-aud-menu" role="listbox" aria-multiselectable="true">
          {groups.length === 0 ? <div className="fb-aud-menu__none">No audience matches “{find}”.</div> : null}
          {groups.map(([group, list]) => (
            <div key={group}>
              <div className="fb-aud-menu__group">{group}</div>
              {list.map((o) => {
                const on = value.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`fb-aud-menu__opt${on ? ' is-on' : ''}`}
                    onClick={() => toggle(o.value)}
                  >
                    <span className="fb-aud-menu__box">{on ? '✓' : ''}</span>{o.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function scopeHint(options) {
  const groups = new Set(options.map((o) => o.group))
  if ([...groups].some((g) => /school/i.test(g))) return 'Admin scope: the whole school, a department, program, year level or section.'
  if ([...groups].some((g) => /department/i.test(g))) return 'Dean scope: your department, its programs, year levels and sections.'
  if ([...groups].some((g) => /program/i.test(g))) return 'Program chair scope: your program, its year levels and sections.'
  return 'Faculty scope: select one or more assigned sections.'
}

// + New Announcement / Edit
function AnnouncementForm({ item, onClose, onDone }) {
  const [title, setTitle] = useState(item?.title || '')
  const [body, setBody] = useState(item?.body || '')
  const [targets, setTargets] = useState(item ? item.targets.map((t) => t.token) : [])
  const [pinned, setPinned] = useState(item?.is_pinned || false)
  const [status, setStatus] = useState(item?.status || 'published')
  const [files, setFiles] = useState([])
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [options, setOptions] = useState(null)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    announcementsApi.targets().then((r) => setOptions(r.response ? r.body.options : []))
  }, [])

  const labelOf = (token) => options?.find((o) => o.value === token)?.label
    || item?.targets.find((t) => t.token === token)?.label
    || token

  function check(nextStatus) {
    const e = {}
    if (!title.trim()) e.title = 'Title is required.'
    if (isEmptyHtml(body)) e.body = 'Write the message.'
    if (nextStatus === 'published' && !targets.length) e.targets = 'Choose at least one audience.'
    if (files.length && fileProblem(files[0])) e.file = `${files[0].name}: ${fileProblem(files[0])}`
    return e
  }

  async function submit(nextStatus) {
    const e = check(nextStatus)
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const r = await announcementsApi.save(item?.id, {
      title: title.trim(), body, targets, is_pinned: pinned, status: nextStatus, file: files[0], removeAttachment,
    })
    setBusy(false)
    if (!r.response) {
      setError(r)
      return
    }
    const notified = r.body?.notified
    onDone(nextStatus === 'published' && notified != null ? `${r.message} ${notified} student(s) notified.` : r.message)
  }

  const clear = (key) => { if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined })) }
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
        <label htmlFor="fb-ann-aud">Target Audience*</label>
        {options === null ? (
          <span className="fb-hint">Loading choices…</span>
        ) : options.length === 0 ? (
          <span className="fb-hint">You have no audiences you can post to.</span>
        ) : (
          <>
            <AudiencePicker options={options} value={targets} labelOf={labelOf} invalid={Boolean(errors.targets)} onChange={(t) => { setTargets(t); clear('targets') }} />
            <span className="fb-hint">{scopeHint(options)} Students in those groups are notified automatically.</span>
          </>
        )}
        {errors.targets ? <div className="fb-field__err">{errors.targets}</div> : null}
      </div>
      <div className="fb-field">
        <label htmlFor="fb-ann-title">Title*</label>
        <input id="fb-ann-title" type="text" maxLength={150} placeholder="Enter the title…" value={title} aria-invalid={Boolean(errors.title)} onChange={(e) => { setTitle(e.target.value); clear('title') }} />
        {errors.title ? <div className="fb-field__err">{errors.title}</div> : null}
      </div>
      <div className="fb-field">
        <label htmlFor="fb-ann-body">Content / Message*</label>
        <RichTextEditor id="fb-ann-body" initial={item?.body || ''} placeholder="Type here…" invalid={Boolean(errors.body)} onChange={(html) => { setBody(html); clear('body') }} />
        {errors.body ? <div className="fb-field__err">{errors.body}</div> : null}
      </div>
      <div className="fb-field fb-field--row">
        <label className="fb-check">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Pin announcement to top
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
          onChange={(f) => { setFiles(f); clear('file') }}
          max={1}
          multiple={false}
          hint="PDF, DOCX, PPTX, XLSX, PNG, JPG, ZIP · max 25 MB · one file"
        />
        {errors.file ? <div className="fb-field__err">{errors.file}</div> : null}
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
