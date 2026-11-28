export const colors = ['#E0DAFB', '#C7C9F9', '#C0CEF9', '#7FA0F2', '#CDF8E3', '#B79AD6', '#FBB6F2', '#A9EBFB', '#F9F28A', '#F9B38A', '#F28080']
export const colorNames = ['Lavender', 'Periwinkle', 'Sky', 'Blue', 'Mint', 'Purple', 'Pink', 'Cyan', 'Yellow', 'Orange', 'Red']

/* ---------- helpers ---------- */
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
export const findDeck = (tree, id) => {
  for (const c of tree) {
    const d = c.decks.find((x) => x.id === id)
    if (d) return { c, d }
  }
  return {}
}
export const classColor = (c) => c.color || colors[0]
export const deckColor = (d) => d.color || colors[0]
// Answer the quiz accepts: the highlighted key answer when set, otherwise the whole answer.
export const keyOf = (k) => (k.key_answer && k.key_answer.trim() ? k.key_answer : k.answer)
