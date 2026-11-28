/*
  F6 · View File   (route /classes/:classId/resources/:fileId[?from=feed])
  F6 PDF preview · F6a image preview · F6b can't preview · S2 not found.
  Works for class resources and post attachments.
*/
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ClassFrame } from './FbLayout'
import Icon from '../components/Icon'
import { ApiProblem, FileChip } from '../components/Common'
import { fileUrl, resourcesApi } from '../api/phpApi'
import { fmtDate } from '../utils/format'

export default function ViewFilePage() {
  const { classId, fileId } = useParams()
  const [params] = useSearchParams()
  const fromFeed = params.get('from') === 'feed'
  const backTo = `/classes/${classId}/${fromFeed ? 'feed' : 'resources'}`
  const backLabel = fromFeed ? 'Back to Class Feed' : 'Back to Resources'
  const className = useLocation().state?.className || ''
  const [result, setResult] = useState(null)

  useEffect(() => {
    let live = true
    resourcesApi.show(fileId).then((r) => { if (live) setResult(r) })
    return () => { live = false }
  }, [fileId])

  if (!result) {
    return <ClassFrame classId={classId} className={className}><div className="fb-loading">Loading…</div></ClassFrame>
  }
  if (!result.response) {
    return (
      <ClassFrame classId={classId} className={className}>
        <section className="fb-panel">
          <ApiProblem
            result={result.code === 404 ? { ...result, message: 'It may have been deleted, or it isn’t shared with your section.' } : result}
            notFoundTitle="File not found"
            backTo={backTo}
            backLabel={backLabel}
          />
        </section>
      </ClassFrame>
    )
  }

  const f = result.body.file
  const src = fileUrl(f.view_url)
  return (
    <ClassFrame classId={classId} className={className}>
      <div className="fb-view-head">
        <div className="fb-view-head__title">
          <Link className="fb-btn fb-btn--line fb-btn--sm" to={backTo}>‹ {backLabel}</Link>
          <div>
            <h1>{f.name}</h1>
            <p>{f.type} · {f.size_label}</p>
          </div>
        </div>
        <a className="fb-btn" href={fileUrl(f.download_url)}><Icon name="download" />Download</a>
      </div>
      <div className="fb-view-body">
        <div className="fb-preview">
          {!f.viewable ? (
            <div className="fb-preview__none">
              <FileChip type={f.type} />
              <p>{f.type} files can’t be previewed in the browser.</p>
              <p>Use <b>Download</b> to open it.</p>
            </div>
          ) : f.type === 'PDF' ? (
            <iframe src={src} title={f.name} />
          ) : (
            <img src={src} alt={f.name} />
          )}
        </div>
        <aside className="fb-side">
          <div className="fb-card">
            <h4>File details</h4>
            <ul>
              <li><b>Type:</b> {f.type}</li>
              <li><b>Size:</b> {f.size_label}</li>
              <li><b>Original name:</b> {f.original_name}</li>
              <li><b>Uploaded by:</b> {f.uploaded_by?.name || '—'}</li>
              <li><b>Date:</b> {fmtDate(f.uploaded_at)}</li>
            </ul>
          </div>
        </aside>
      </div>
    </ClassFrame>
  )
}
