// Checks a flashcard JSON file before anything is saved.
// Rules follow JsonManager::importDeck: non-empty question and answer on every card,
// a non-empty flashcards array, and difficulty easy | medium | hard (default medium).

export const MAX_FILE_BYTES = 1024 * 1024 // 1 MB
export const MAX_CARDS = 500
const DIFFICULTIES = ['easy', 'medium', 'hard']

// Returns { ok: true, cards, info } or { ok: false, errors }.
// cards: [{ question, answer, explanation (string | null), difficulty }]
// info:  { class, deck, description } when present in the file.
export function parseFlashcardJson(text) {
  const fail = (...errors) => ({ ok: false, errors })

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    return fail(`The file is not valid JSON (${e.message}).`)
  }

  // Accept the reviewer format { class, deck, description, flashcards: [...] }
  // and a plain list of cards [ {question, answer}, ... ].
  let list
  let info = {}
  if (Array.isArray(data)) {
    list = data
  } else if (data && typeof data === 'object' && 'flashcards' in data) {
    list = data.flashcards
    info = { class: data.class, deck: data.deck, description: data.description }
  } else {
    return fail('Invalid structure. Expected an object with a "flashcards" array, or a plain list of flashcards.')
  }

  if (!Array.isArray(list)) return fail('"flashcards" must be a list.')
  if (list.length === 0) return fail('The JSON file contains no flashcards.')
  if (list.length > MAX_CARDS) return fail(`A file can hold at most ${MAX_CARDS} flashcards (this one has ${list.length}).`)

  const errors = []
  for (const key of ['class', 'deck', 'description']) {
    const v = info[key]
    if (v !== undefined && v !== null && typeof v !== 'string') errors.push(`"${key}" must be text.`)
  }

  const cards = []
  list.forEach((c, i) => {
    const n = i + 1
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      errors.push(`Flashcard #${n} must be an object with "question" and "answer".`)
      return
    }
    const question = typeof c.question === 'string' ? c.question.trim() : ''
    const answer = typeof c.answer === 'string' ? c.answer.trim() : ''
    if (!question) errors.push(`Flashcard #${n}: "question" is required and must not be empty.`)
    if (!answer) errors.push(`Flashcard #${n}: "answer" is required and must not be empty.`)

    if (c.explanation != null && typeof c.explanation !== 'string') {
      errors.push(`Flashcard #${n}: "explanation" must be text or null.`)
    }
    const difficulty = c.difficulty ?? 'medium'
    if (!DIFFICULTIES.includes(difficulty)) {
      errors.push(`Flashcard #${n}: "difficulty" must be easy, medium, or hard.`)
    }

    if (question && answer && DIFFICULTIES.includes(difficulty)) {
      const explanation = typeof c.explanation === 'string' && c.explanation.trim() !== '' ? c.explanation.trim() : null
      cards.push({ question, answer, explanation, difficulty })
    }
  })

  if (errors.length) return { ok: false, errors }
  return { ok: true, cards, info }
}
