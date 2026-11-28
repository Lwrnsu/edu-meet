/*
  Building blocks shared by the Files & Blogs screens:
  EmptyState, ApiProblem, Modal, ConfirmDialog, ErrorBox, FileChip.
*/
import { useEffect } from 'react'
import { Link } from 'react-router'
import Icon from './Icon'
import { typeClass } from '../utils/format'

// Big centred message: empty lists, no access, not found, not logged in.
export function EmptyState({ icon, title, text, children }) {
  return (
    <div className="fb-empty">
      <div className="fb-empty__art"><Icon name={icon} size={40} /></div>
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {children}
    </div>
  )
}

/*
  Shows the right message for a failed ApiResponse:
  401 not logged in · 403 no access · anything else the server's message.
*/
export function ApiProblem({ result, notFoundTitle = 'Not found', backTo, backLabel }) {
  if (result.code === 401) {
    return (
      <EmptyState icon="lock" title="Please log in first" text="Your session has ended or you aren't logged in.">
        <Link className="fb-btn fb-btn--sm" to="/">Go to login</Link>
      </EmptyState>
    )
  }
  if (result.code === 403) {
    return (
      <EmptyState
        icon="lock"
        title="You don’t have access to this class"
        text="Only students enrolled in this class and its instructors can see its resources and posts."
      >
        {backTo ? <Link className="fb-btn fb-btn--sm" to={backTo}>{backLabel}</Link> : null}
      </EmptyState>
    )
  }
  if (result.code === 404) {
    return (
      <EmptyState icon="missing" title={notFoundTitle} text={result.message}>
        {backTo ? <Link className="fb-btn fb-btn--sm" to={backTo}>{backLabel}</Link> : null}
      </EmptyState>
    )
  }
  return <EmptyState icon="missing" title="Something went wrong" text={result.message} />
}

// Pop-up with a blue header. Closes on Escape or the ✕ button.
export function Modal({ title, onClose, children, footer, small = false, onSubmit }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const Body = onSubmit ? 'form' : 'div'
  return (
    <div className="fb-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Body
        className={`fb-modal${small ? ' fb-modal--small' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit() } : undefined}
        noValidate
      >
        {title ? (
          <div className="fb-modal__head">
            <span>{title}</span>
            <button type="button" onClick={onClose} aria-label="Close">✕</button>
          </div>
        ) : null}
        <div className="fb-modal__body">{children}</div>
        {footer ? <div className="fb-modal__foot">{footer}</div> : null}
      </Body>
    </div>
  )
}

// "Delete …?" confirmation.
export function ConfirmDialog({ title, text, confirmLabel = 'Delete', busy, onConfirm, onClose }) {
  return (
    <Modal
      small
      onClose={onClose}
      footer={
        <>
          <button type="button" className="fb-btn fb-btn--line fb-btn--sm" onClick={onClose}>Cancel</button>
          <button type="button" className="fb-btn fb-btn--danger fb-btn--sm" disabled={busy} onClick={onConfirm}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="fb-confirm">
        <span className="fb-ic fb-ic--del fb-ic--big"><Icon name="trash" size={26} /></span>
        <div className="fb-confirm__title">{title}</div>
        <div className="fb-muted">{text}</div>
      </div>
    </Modal>
  )
}

// Red box with the server message and its list of errors.
export function ErrorBox({ result }) {
  if (!result) return null
  const list = result.body?.errors || []
  return (
    <div className="fb-errors" role="alert">
      {result.message}
      {list.length ? <ul>{list.map((m) => <li key={m}>{m}</li>)}</ul> : null}
    </div>
  )
}

export function FileChip({ type, mini = false }) {
  return <span className={`fb-chip ${typeClass(type)}${mini ? ' fb-chip--mini' : ''}`}>{type}</span>
}
