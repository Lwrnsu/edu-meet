import { Head, Pill } from './ui.jsx'

// Top bar of a study session: deck name and a way back to the deck.
export function SessionHead({ d, onLeave }) {
  return <Head back={<Pill h={`#/deck/${d.id}`} t="Leave Session" onClick={onLeave} />} icon="title" title={d.name} />
}

// Progress bar and "Card x out of y" line shown during a session.
export function ProgressBar({ pos, n }) {
  return (
    <>
      <div className="prog" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={n} aria-valuenow={pos}><i style={{ width: `${Math.max(4, (pos / Math.max(n, 1)) * 100)}%` }} /></div>
      <p className="pc">Card {pos} out of {n}</p>
    </>
  )
}
