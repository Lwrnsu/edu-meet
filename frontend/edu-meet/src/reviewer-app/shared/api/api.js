// Two backends run side by side:
//   PHP         /flashcard-reviewer/actions/api/...  everything, including quizzes and notes
//   Spring Boot /springboot/api/...                  classes, decks, flashcards, and the tree
//
// Classes, decks, flashcards, and the tree go to Spring Boot when it is running.
// If Spring Boot can't be reached, those calls fall back to PHP.
// Quizzes and notes always use PHP.
// Set VITE_USE_SPRING=false in a .env file to use PHP only.

const PHP = '/flashcard-reviewer/actions/api'
const SPRING = '/springboot/api'
const USE_SPRING = import.meta.env.VITE_USE_SPRING !== 'false'

// Sends one request. reached is false when the server didn't answer with JSON.
async function send(url, options) {
  let res
  let json = null
  try {
    res = await fetch(url, options)
    json = await res.json().catch(() => null)
  } catch {
    return { reached: false }
  }
  return json ? { reached: true, json } : { reached: false }
}

function unwrap(json) {
  if (!json.success) throw new Error(json.message || 'Something went wrong.')
  return json.data
}

async function php(path, options) {
  const r = await send(`${PHP}/${path}`, options)
  if (!r.reached) throw new Error('Cannot reach the server. Is Apache and MySQL running?')
  return unwrap(r.json)
}

const jsonPost = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// Reviewer requests: Spring Boot first, PHP if Spring Boot isn't reachable.
async function reviewerRequest(options, query = '') {
  if (USE_SPRING) {
    const r = await send(`${SPRING}/reviewer${query}`, options)
    if (r.reached) return unwrap(r.json)
  }
  return php(`reviewer.php${query}`, options)
}

const isQuiz = (body) => String(body?.action || '').startsWith('quiz_')

export const api = {
  tree: () => reviewerRequest({}, '?action=tree'),
  // Quiz actions are only in PHP. Everything else can use Spring Boot.
  reviewer: (body) => (isQuiz(body) ? php('reviewer.php', jsonPost(body)) : reviewerRequest(jsonPost(body))),
  notesList: () => php('notes.php?action=list'),
  notes: (body) => php('notes.php', jsonPost(body)),
}
