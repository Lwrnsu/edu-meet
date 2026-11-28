// Talks to the PHP backend in actions/api. Every response is { success, message, data }.
const BASE = '/flashcard-reviewer/actions/api'

async function request(path, options) {
  let res
  try {
    res = await fetch(`${BASE}/${path}`, options)
  } catch {
    throw new Error('Cannot reach the server. Is Apache and MySQL running?')
  }
  const json = await res.json().catch(() => null)
  if (!json || !json.success) {
    throw new Error(json?.message || 'Something went wrong.')
  }
  return json.data
}

const post = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const api = {
  tree: () => request('reviewer.php?action=tree'),
  reviewer: (body) => post('reviewer.php', body),
  notesList: () => request('notes.php?action=list'),
  notes: (body) => post('notes.php', body),
}
