import { useState } from 'react'
import { I } from '../../shared/components/icons.jsx'
import { keyOf } from '../../shared/utils/helpers.js'
import { SessionHead, ProgressBar } from '../../shared/components/SessionChrome.jsx'

const Confetti = () => (
  <svg className="conf" viewBox="0 0 396 231" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 231V172q30-34 62-12l30 44-14 27z" fill="#FDEFC4" /><path d="M396 231V160q-36-18-68 22l-22 49z" fill="#FDEFC4" />
    <g fill="none" stroke="#FCDCD2" strokeWidth="13" strokeLinecap="round"><path d="M52 70q34-18 22 28t14 78" /><path d="M118 150q40-44 84-12" /><path d="M344 64q-34 12-12 54t-34 64" /><path d="M262 140q28-30 46-6" /></g>
    <g><rect x="6" y="62" width="14" height="14" rx="3" fill="#BDEFFA" transform="rotate(20 13 69)" /><rect x="12" y="96" width="13" height="13" rx="3" fill="#F8D3E4" /><rect x="372" y="54" width="14" height="14" rx="3" fill="#BDEFFA" /><rect x="364" y="94" width="13" height="13" rx="3" fill="#F8D3E4" transform="rotate(15 370 100)" /><rect x="130" y="64" width="14" height="14" rx="3" fill="#BDEFFA" transform="rotate(25 137 71)" /><rect x="236" y="96" width="14" height="14" rx="3" fill="#F8D3E4" /><rect x="292" y="62" width="13" height="13" rx="3" fill="#BDEFFA" /></g>
  </svg>
)

// Flashcard mode: flip through the cards. Nothing is recorded on the server.
export function FlashcardSession({ d }) {
  const [s, setS] = useState({ i: 0, flip: false, anim: false, seen: false })
  const n = d.cards.length
  const done = s.i >= n
  const pos = Math.min(s.i, Math.max(n - 1, 0)) + 1
  const head = <SessionHead d={d} />
  const bar = <ProgressBar pos={pos} n={n} />
  const hl = (color) => (color ? { background: color } : undefined)
  const reset = () => setS({ i: 0, flip: false, anim: false, seen: false })

  if (!n) return <>{head}<p className="empty">This deck has no flashcards yet. Add one to start a session.</p></>

  const nav = (mid) => (
    <div className="fnav">
      <button type="button" className="btn nv" disabled={s.i === 0 && !done} onClick={() => setS({ ...s, i: Math.max(0, (done ? n : s.i) - 1), flip: false, anim: false, seen: true })}>
        <I n="prev" />Previous</button>
      {mid}
    </div>
  )
  if (done) {
    return (
      <>{head}{bar}
        <section className="flip done" aria-live="polite">
          <Confetti /><span className="fi"><I n="file" /></span>
          <h2>LESSON COMPLETE</h2>
          <p>You’ve worked with {n}/{n} flashcards<br />of <b>{d.name}</b></p>
        </section>
        <div className="fnav">
          <button type="button" className="btn nv" onClick={() => setS({ ...s, i: n - 1, flip: false, anim: false, seen: true })}><I n="prev" />Previous</button>
          <button type="button" className="btn lg" onClick={reset}><I n="start" />Review again</button>
          <a className="btn sf nv" style={{ color: '#fff', background: '#FF7B7B', borderColor: '#D04040' }} href={`#/deck/${d.id}`}>Leave session<I n="leave" /></a>
        </div>
      </>
    )
  }
  const k = d.cards[Math.min(s.i, n - 1)]
  const turnCard = () => setS({ ...s, flip: !s.flip, anim: true, seen: true })
  return (
    <>{head}{bar}
      <div className="fl" role="button" tabIndex={0} aria-label="Flip card" onClick={turnCard}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turnCard() } }}>
        <div className={`fl-in${s.flip ? ' back' : ''}${s.anim ? ' anim' : ''}`}>
          <section className="fl-f" aria-hidden={s.flip}>
            <h3>Question</h3>
            <div className="bd"><p className="qq">{k.question}</p></div>
          </section>
          <section className="fl-f b" aria-hidden={!s.flip}>
            <h3>Answer</h3>
            <div className="bd"><p className="aa"><mark style={hl(k.color)}>{keyOf(k)}</mark></p></div>
          </section>
        </div>
      </div>
      {nav(
        <>
          <button type="button" className="btn lg" onClick={() => setS({ ...s, flip: !s.flip, anim: true, seen: true })}>Flip Card</button>
          <button type="button" className="btn nv" disabled={!s.seen} onClick={() => setS({ ...s, i: s.i + 1, flip: false, anim: false, seen: false })}>Next<I n="next" /></button>
        </>
      )}
    </>
  )
}
