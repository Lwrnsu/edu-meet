import { keyOf } from '../../shared/utils/helpers.js'

export function Answer({ k }) {
  const key = keyOf(k)
  const st = k.color ? { background: k.color } : undefined
  const i = key !== k.answer ? k.answer.indexOf(key) : -1
  return i < 0 ? <mark style={st}>{k.answer}</mark> : <>{k.answer.slice(0, i)}<mark style={st}>{key}</mark>{k.answer.slice(i + key.length)}</>
}
