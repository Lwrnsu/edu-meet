export const PALETTE = [
  { bg: '#5B8DEF', bd: '#2B4FB0', fg: '#10205F', top: '#6C93F2' },
  { bg: '#B79AF5', bd: '#6B4BC8', fg: '#2E1572', top: '#B3A0F7' },
  { bg: '#7B6FE0', bd: '#3B2FA0', fg: '#0D0850', top: '#8B7FE8' },
  { bg: '#F7F27A', bd: '#B8A92B', fg: '#4F4400', top: '#F7F27A' },
  { bg: '#FBB6F2', bd: '#C45AB8', fg: '#5A1450', top: '#FBB6F2' },
  { bg: '#F9B38A', bd: '#C4682F', fg: '#5A2A0A', top: '#F9B38A' },
  { bg: '#A9EBFB', bd: '#3AA6C4', fg: '#0C4456', top: '#A9EBFB' },
  { bg: '#CDF8E3', bd: '#3AA67A', fg: '#0C4A30', top: '#CDF8E3' },
]
export const GENERAL = { bg: '#E4E4EC', bd: '#8A8A9A', fg: '#4A4A5C', top: '#D8D8E4' }
export const PINNED = { bg: '#6EE7D8', bd: '#2BB5A5', fg: '#0F4F48', top: '#96EEEA' }
export const ALL = { bg: '#fff', bd: '#6B6B8A', fg: '#2A2A40' }
// Categories are plain text in the database, so each name gets a stable color here.
export const catStyle = (name) => {
  if (!name || name === 'General') return GENERAL
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}
export const pinned = (n) => Number(n.is_pinned) === 1
export const toDate = (s) => new Date(String(s).replace(' ', 'T'))
export const fmtDate = (s) => (s ? toDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
export const fmtTime = (s) => (s ? toDate(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')
// Same order as the server: pinned first, then most recently updated.
export const sortNotes = (list) => [...list].sort((a, b) => (Number(pinned(b)) - Number(pinned(a))) || String(b.updated_at).localeCompare(String(a.updated_at)))
