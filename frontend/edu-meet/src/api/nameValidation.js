const LETTERS_ONLY_NAME = /^[A-Za-z]+(?: [A-Za-z]+)*$/

export function isLettersOnlyName(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '') return false
  return LETTERS_ONLY_NAME.test(trimmed)
}
