// Small helpers shared by the Files & Blogs screens.

export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'zip']
export const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')
export const MAX_FILE_BYTES = 25 * 1024 * 1024

export const FILE_TYPE_FILTERS = [
  ['pdf', 'PDF'],
  ['doc', 'Word (DOC/DOCX)'],
  ['slide', 'Slides (PPT/PPTX)'],
  ['sheet', 'Sheets (XLS/XLSX)'],
  ['image', 'Images (PNG/JPG)'],
  ['zip', 'ZIP'],
]

export function extensionOf(name) {
  const parts = String(name).toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

// File-type chip colour: "PDF" -> "fb-t-pdf"
export function typeClass(type) {
  const t = String(type).toLowerCase()
  if (t === 'pdf') return 'fb-t-pdf'
  if (t === 'doc' || t === 'docx') return 'fb-t-doc'
  if (t === 'ppt' || t === 'pptx') return 'fb-t-ppt'
  if (t === 'xls' || t === 'xlsx') return 'fb-t-xls'
  if (['png', 'jpg', 'jpeg'].includes(t)) return 'fb-t-img'
  return 'fb-t-zip'
}

// Checks a chosen file before upload. Returns a problem or '' if fine.
export function fileProblem(file) {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) return 'Not an allowed type'
  if (file.size > MAX_FILE_BYTES) return 'Over the 25 MB limit'
  if (file.size === 0) return 'Empty file'
  return ''
}

function toDate(value) {
  return new Date(String(value).replace(' ', 'T'))
}

// "2026-11-14 08:45:00" -> "Nov 14, 2026" (· "8:45 AM")
export function fmtDate(value, withTime = false) {
  if (!value) return '—'
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return value
  const date = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  return withTime ? `${date} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : date
}

export function fmtSize(bytes) {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1).replace(/\.0$/, '')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function initials(name) {
  return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

// "5 min ago", "Yesterday", "Nov 20"
export function timeAgo(value) {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return value
  const mins = Math.round((Date.now() - d) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 24 * 60) {
    const h = Math.round(mins / 60)
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  }
  if (mins < 48 * 60) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/*
  Notification links from PHP are page names; map them to React routes.
  resources.php?class_id=100 -> /classes/100/resources
  feed.php?class_id=100      -> /classes/100/feed
  announcements.php?id=5     -> /announcements?id=5
*/
export function notificationRoute(link) {
  const [page, qs = ''] = String(link || '').split('?')
  const params = new URLSearchParams(qs)
  const classId = params.get('class_id')
  if (page.endsWith('resources.php') && classId) return `/classes/${classId}/resources`
  if (page.endsWith('feed.php') && classId) return `/classes/${classId}/feed`
  if (page.endsWith('announcements.php')) return params.get('id') ? `/announcements?id=${params.get('id')}` : '/announcements'
  return null
}
