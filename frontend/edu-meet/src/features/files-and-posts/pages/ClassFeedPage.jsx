/*
  BLOGS & ANNOUNCEMENTS — Class → Class Feed tab   (route /classes/:classId/feed)

  B1  Class Feed (Student)      B1a empty     B1b Load more (10 at a time)
  B2  Class Feed (Faculty)      B2a empty     type filter + "view as section" filter
  B3  Create Post               announcement / blog · Department → Program → Section · errors
  B4  Edit Post                 change fields, remove / add attachments
  B5  Delete Post confirm       also removes its attachments
*/
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ClassFrame } from './FbLayout'
import Icon from '../components/Icon'
import FilePicker from '../components/FilePicker'
import AudiencePicker from '../components/AudiencePicker'
import { ApiProblem, ConfirmDialog, EmptyState, ErrorBox, FileChip, Modal } from '../components/Common'
import { useToast } from '../hooks/useToast'
import { fileUrl, postsApi, resourcesApi } from '../api/phpApi'
import { fileProblem, fmtDate, initials } from '../utils/format'

const MAX_MESSAGE = 5000
const MAX_ATTACHMENTS = 5

export default function ClassFeedPage() {
  const { classId } = useParams()
  const [type, setType] = useState('')
  const [section, setSection] = useState('')
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [state, setState] = useState(null) // last ApiResponse (for errors / flags)
  const [tree, setTree] = useState([])
  const [modal, setModal] = useState(null) // { kind: 'form' | 'delete', post }
  const [toast, showToast] = useToast()

  const load = useCallback(async (nextPage = 1) => {
    const r = await postsApi.feed(classId, nextPage, type, section)
    setState(r)
    if (!r.response) return
    setPage(nextPage)
    setPosts((prev) => (nextPage === 1 ? r.body.posts : prev.concat(r.body.posts)))
  }, [classId, type, section])

  useEffect(() => { load(1) }, [load])

  const canPost = state?.response && state.body.can_post
  useEffect(() => {
    if (!canPost || tree.length) return
    resourcesApi.sections(classId).then((r) => { if (r.response) setTree(r.body.tree) })
  }, [canPost, classId, tree.length])

  const done = (message, ok = true) => {
    setModal(null)
    showToast(message, ok)
    load(1)
  }

  const blocked = state && !state.response
  const filtered = type !== '' || section !== ''

  return (
    <ClassFrame classId={classId} className={state?.body?.class?.name}>
      <section className="fb-panel">
        {state && !blocked ? (
          <div className="fb-toolbar">
            <h2>Class Feed</h2>
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Post type">
              <option value="">All posts</option>
              <option value="announcement">Announcements</option>
              <option value="blog">Blogs</option>
            </select>
            {canPost && tree.length ? (
              <select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Visible to section">
                <option value="">All sections</option>
                {tree.flatMap((d) => d.programs.map((p) => (
                  <optgroup key={`${d.id}-${p.id}`} label={`${d.code} · ${p.code}`}>
                    {p.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                )))}
              </select>
            ) : null}
            {canPost ? (
              <button type="button" className="fb-btn" onClick={() => setModal({ kind: 'form', post: null })}>
                <Icon name="plus" />Create Post
              </button>
            ) : null}
          </div>
        ) : null}

        {!state ? (
          <div className="fb-loading">Loading…</div>
        ) : blocked ? (
          <ApiProblem result={state} notFoundTitle="Class not found" backTo="/" backLabel="Back to Classes" />
        ) : posts.length === 0 ? (
          filtered ? (
            <EmptyState icon="mega" title="Nothing here yet" text="No posts match this filter. Choose “All posts” to see everything." />
          ) : canPost ? (
            <EmptyState icon="mega" title="No posts yet" text="Posts you publish will show up here for your students.">
              <button type="button" className="fb-btn fb-btn--sm" onClick={() => setModal({ kind: 'form', post: null })}>
                <Icon name="plus" />Create your first post
              </button>
            </EmptyState>
          ) : (
            <EmptyState icon="mega" title="No announcements yet" text="Your instructor hasn’t posted anything. New announcements will appear here." />
          )
        ) : (
          <div className="fb-stack">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                classId={classId}
                className={state.body.class?.name}
                onEdit={() => setModal({ kind: 'form', post: p })}
                onDelete={() => setModal({ kind: 'delete', post: p })}
              />
            ))}
          </div>
        )}
        {state?.response && state.body.has_more ? (
          <div className="fb-more">
            <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={() => load(page + 1)}>Load more</button>
          </div>
        ) : null}
      </section>

      {modal?.kind === 'form' ? (
        <PostForm classId={classId} post={modal.post} tree={tree} onClose={() => setModal(null)} onDone={done} />
      ) : null}
      {modal?.kind === 'delete' ? <DeletePost post={modal.post} onClose={() => setModal(null)} onDone={done} /> : null}
      {toast}
    </ClassFrame>
  )
}

function PostCard({ post: p, classId, className, onEdit, onDelete }) {
  return (
    <article className="fb-post">
      <div className="fb-post__top">
        <div className="fb-avatar">{initials(p.author.name)}</div>
        <div className="fb-post__who">
          {p.author.name || 'Unknown'}
          <small>{fmtDate(p.created_at, true)} · {p.visible_label}</small>
        </div>
        <span className={`fb-type fb-type--${p.type}`}>{p.type === 'blog' ? 'Blog' : 'Announcement'}</span>
        {p.can_edit ? (
          <>
            <button type="button" className="fb-ic fb-ic--edit" title="Edit" aria-label={`Edit ${p.title}`} onClick={onEdit}><Icon name="edit" /></button>
            <button type="button" className="fb-ic fb-ic--del" title="Delete" aria-label={`Delete ${p.title}`} onClick={onDelete}><Icon name="trash" /></button>
          </>
        ) : null}
      </div>
      <h3>{p.title}</h3>
      <p>{p.message}</p>
      {p.attachments.length ? (
        <div className="fb-atts">
          {p.attachments.map((a) => {
            const label = <><FileChip type={a.type} mini />{a.original_name} · {a.size_label}</>
            return a.viewable ? (
              <Link key={a.id} className="fb-att" to={`/classes/${classId}/resources/${a.id}?from=feed`} state={{ className }}>{label}</Link>
            ) : (
              <a key={a.id} className="fb-att" href={fileUrl(a.download_url)}>{label}</a>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}

// B3 / B4 · Create or edit a post
function PostForm({ classId, post, tree, onClose, onDone }) {
  const [title, setTitle] = useState(post?.title || '')
  const [type, setType] = useState(post?.type || 'announcement')
  const [message, setMessage] = useState(post?.message || '')
  const [blocks, setBlocks] = useState(post ? post.visible_to.map((b) => b.id) : [])
  const [files, setFiles] = useState([])
  const [removeFiles, setRemoveFiles] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const existing = post?.attachments || []
  const fieldErrors = error?.body?.fields || {}

  // Typing in a field clears that field's old error.
  function clearField(name) {
    if (!fieldErrors[name]) return
    const rest = { ...fieldErrors }
    delete rest[name]
    const fileErrs = error.body?.errors || []
    if (Object.keys(rest).length === 0 && fileErrs.length === 0) setError(null)
    else setError({ ...error, body: { ...error.body, fields: rest } })
  }

  async function submit() {
    const bad = files.filter((f) => fileProblem(f)).map((f) => `${f.name}: ${fileProblem(f)}`)
    if (bad.length) {
      setError({ message: 'Some attachments can’t be added:', body: { errors: bad } })
      return
    }
    if (existing.length - removeFiles.length + files.length > MAX_ATTACHMENTS) {
      setError({ message: `A post can have at most ${MAX_ATTACHMENTS} attachments.` })
      return
    }
    setBusy(true)
    const r = await postsApi.save(classId, post?.id, { title, type, message, blocks, files, removeFiles })
    setBusy(false)
    if (!r.response) {
      setError(r)
      return
    }
    onDone(r.message)
  }

  // Field problems show under each field; anything else in the red box.
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const fileErrors = error?.body?.errors || []
  let boxError = error
  if (hasFieldErrors) {
    boxError = fileErrors.length ? { message: 'Some attachments can’t be added:', body: { errors: fileErrors } } : null
  }

  return (
    <Modal
      title={post ? 'Edit Post' : 'Create Post'}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="fb-btn fb-btn--sm" disabled={busy}>{busy ? 'Saving…' : post ? 'Save' : 'Post'}</button>
        </>
      }
    >
      <ErrorBox result={boxError} />
      <div className="fb-field">
        <label htmlFor="fb-post-title">Title</label>
        <input
          id="fb-post-title"
          type="text"
          maxLength={150}
          placeholder="Enter the title…"
          className={fieldErrors.title ? 'fb-bad' : ''}
          value={title}
          onChange={(e) => { setTitle(e.target.value); clearField('title') }}
        />
        {fieldErrors.title ? <div className="fb-ferr">{fieldErrors.title}</div> : null}
      </div>
      <div className="fb-field">
        <span className="fb-label">Post Type</span>
        <div className="fb-seg" role="radiogroup" aria-label="Post type">
          {[['announcement', 'Announcement'], ['blog', 'Blog']].map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="fb-post-type" value={value} checked={type === value} onChange={() => setType(value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {fieldErrors.type ? <div className="fb-ferr">{fieldErrors.type}</div> : null}
      </div>
      <div className="fb-field">
        <span className="fb-label">
          Target Audience <span className="fb-hint">(Department → Program → Section · none ticked = all sections)</span>
        </span>
        <AudiencePicker tree={tree} selected={blocks} onChange={setBlocks} />
        {fieldErrors.blocks ? <div className="fb-ferr">{fieldErrors.blocks}</div> : null}
      </div>
      <div className="fb-field">
        <label htmlFor="fb-post-message">Message</label>
        <textarea
          id="fb-post-message"
          maxLength={MAX_MESSAGE}
          placeholder="Type here…"
          className={fieldErrors.message ? 'fb-bad' : ''}
          value={message}
          onChange={(e) => { setMessage(e.target.value); clearField('message') }}
        />
        {fieldErrors.message ? <div className="fb-ferr">{fieldErrors.message}</div> : null}
        <span className="fb-hint">{message.length.toLocaleString()} / 5,000</span>
      </div>
      {existing.length ? (
        <div className="fb-field">
          <span className="fb-label">Current attachments <span className="fb-hint">(tick to remove)</span></span>
          <div className="fb-stack">
            {existing.map((a) => (
              <label className="fb-file-row" key={a.id}>
                <FileChip type={a.type} mini />
                <div className="fb-grow">{a.original_name}<small>{a.size_label}</small></div>
                <input
                  type="checkbox"
                  aria-label={`Remove ${a.original_name}`}
                  checked={removeFiles.includes(a.id)}
                  onChange={(e) => setRemoveFiles(e.target.checked ? removeFiles.concat(a.id) : removeFiles.filter((id) => id !== a.id))}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="fb-field">
        <span className="fb-label">Attachments (optional)</span>
        <FilePicker
          files={files}
          onChange={setFiles}
          max={MAX_ATTACHMENTS}
          hint="PDF, DOCX, PPTX, XLSX, PNG, JPG, ZIP · max 25 MB · up to 5 per post"
        />
      </div>
    </Modal>
  )
}

// B5 · Delete post
function DeletePost({ post, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const n = post.attachments.length
  return (
    <ConfirmDialog
      title={`Delete “${post.title}”?`}
      text={`This can’t be undone.${n ? ` It also removes ${n} attachment${n > 1 ? 's' : ''}.` : ''}`}
      busy={busy}
      onClose={onClose}
      onConfirm={async () => {
        setBusy(true)
        const r = await postsApi.remove(post.id)
        onDone(r.message, r.response)
      }}
    />
  )
}
