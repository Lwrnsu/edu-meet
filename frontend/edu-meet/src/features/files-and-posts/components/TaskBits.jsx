// Small pieces shared by the Tasks and Activities tabs.
import Icon from './Icon'
import { fileUrl } from '../api/phpApi'

// remark from the API → [label, badge class]
export const REMARK = {
  pending: ['Pending', 'fb-badge--pending'],
  submitted: ['Submitted', 'fb-badge--ok'],
  graded: ['Submitted', 'fb-badge--ok'],
  missing: ['Missing', 'fb-badge--bad'],
}

export function RemarkBadge({ remark }) {
  const [label, cls] = REMARK[remark] || REMARK.pending
  return <span className={`fb-badge ${cls}`}>{label}</span>
}

export function StatusPill({ status }) {
  return (
    <span className={`fb-status ${status === 'active' ? 'fb-status--active' : 'fb-status--closed'}`}>
      {status === 'active' ? 'Active' : 'Closed'}
    </span>
  )
}

// File name in a purple box with Download and View buttons.
export function SubmittedFile({ submission }) {
  return (
    <span className="fb-subfile">
      <Icon name="file" size={20} />
      <span className="fb-subfile__name" title={submission.name}>{submission.name}</span>
      <a className="fb-round" href={fileUrl(submission.download_url)} title="Download" aria-label={`Download ${submission.name}`}>
        <Icon name="download" size={16} />
      </a>
      {submission.viewable ? (
        <a className="fb-round" href={fileUrl(submission.view_url)} target="_blank" rel="noreferrer" title="View" aria-label={`View ${submission.name}`}>
          <Icon name="eye" size={16} />
        </a>
      ) : (
        <span className="fb-round fb-round--off" title="This file type can’t be previewed. Download it instead."><Icon name="eye" size={16} /></span>
      )}
    </span>
  )
}
