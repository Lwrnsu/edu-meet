import { useEffect, useRef, useState } from 'react'
import { api } from '../../shared/api/api.js'
import { I } from '../../shared/components/icons.jsx'
import { SessionHead, ProgressBar } from '../../shared/components/SessionChrome.jsx'

// Quiz mode: the server starts the session, checks each typed answer, and records the score.
export function QuizSession({ d }) {
  const [s, setS] = useState({ i: 0, fb: null })
  const [t, setT] = useState('')
  const [qz, setQz] = useState({ phase: 'loading', sid: null, qs: [], result: null })
  const [err, setErr] = useState('')
  const started = useRef(false)
  const n = qz.qs.length
  const pos = Math.min(s.i, Math.max(n - 1, 0)) + 1
  const colorOf = (cardId) => d.cards.find((c) => c.id === cardId)?.color
  const hl = (color) => (color ? { background: color } : undefined)

  const start = async () => {
    setErr('')
    setS({ i: 0, fb: null })
    setT('')
    setQz({ phase: 'loading', sid: null, qs: [], result: null })
    try {
      const r = await api.reviewer({ action: 'quiz_start', deck_id: d.id })
      setQz({ phase: 'quiz', sid: r.session_id, qs: r.questions, result: null })
    } catch (e) {
      setQz({ phase: 'error', sid: null, qs: [], result: null })
      setErr(e.message)
    }
  }
  useEffect(() => {
    if (!started.current) { started.current = true; start() }
  }, [])

  // Leaving mid-quiz marks the session as abandoned on the server.
  const head = <SessionHead d={d} onLeave={() => { if (qz.sid && qz.phase === 'quiz') api.reviewer({ action: 'quiz_abandon', session_id: qz.sid }).catch(() => {}) }} />
  const bar = <ProgressBar pos={pos} n={n} />

  if (qz.phase === 'loading') return <>{head}<p className="empty">Starting session…</p></>
  if (qz.phase === 'error') return <>{head}<p className="empty">{err}</p></>
  if (qz.phase === 'done') {
    const r = qz.result
    const p = Math.round(Number(r.score_percentage))
    return (
      <>{head}
        <section className="sc" style={{ maxWidth: '45.6rem', marginTop: '1.4rem' }}>
          <div className="res">
            <div className="ring" style={{ background: `conic-gradient(#A855F7 ${p}%,#EADCFB 0)` }}><div><b>{r.correct_answers}</b>out of {r.total_questions}</div></div>
            <div><h3>Score Summary</h3>
              <div className="tri"><div className="t1">Correct<b>{r.correct_answers}</b></div><div className="t2">Incorrect<b>{r.incorrect_answers}</b></div><div className="t3">Accuracy<b>{p}%</b></div></div>
              <div className="row"><a className="btn sf" href={`#/deck/${d.id}`}><I n="leave" />Leave session</a><button type="button" className="btn" onClick={start}><I n="start" />Review again</button></div>
            </div>
          </div>
        </section>
      </>
    )
  }

  const k = qz.qs[Math.min(s.i, n - 1)]
  const Q = <><h3>Question</h3><p className="qt">{k.question}</p></>
  const submit = async (e) => {
    e.preventDefault()
    try {
      const fb = await api.reviewer({ action: 'quiz_answer', session_id: qz.sid, flashcard_id: k.id, answer: t })
      setS((p) => ({ ...p, fb: { ...fb, a: t } }))
      setT('')
      setErr('')
    } catch (ex) { setErr(ex.message) }
  }
  const next = async () => {
    if (s.i + 1 < n) { setS({ ...s, i: s.i + 1, fb: null }); return }
    try {
      const r = await api.reviewer({ action: 'quiz_finish', session_id: qz.sid })
      setQz((p) => ({ ...p, phase: 'done', result: r }))
    } catch (ex) { setErr(ex.message) }
  }

  if (!s.fb) {
    return (
      <>{head}{bar}
        <form className="sc" onSubmit={submit}>
          {Q}
          <div className="fld"><label htmlFor="an">Answer</label><textarea id="an" required autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="Type your answer here.." /></div>
          {err && <p className="notice" role="alert">{err}</p>}
          <div className="row"><button className="btn" type="submit">Submit answer</button></div>
        </form>
      </>
    )
  }
  const o = s.fb.correct
  return (
    <>{head}{bar}
      <section className={`sc ${o ? 'ok' : 'no'}`}>
        <span className="bdg"><I n={o ? 'check' : 'x'} />{o ? 'Correct' : 'Incorrect'}</span>
        {Q}<hr />
        <p className="ans">Your answer: {s.fb.a}</p>
        <p className="ans">Correct answer: <mark style={hl(colorOf(k.id))}>{s.fb.correct_answer}</mark></p>
        {s.fb.explanation && <p className="ans">Explanation: {s.fb.explanation}</p>}
        {err && <p className="notice" role="alert">{err}</p>}
        <div className="row"><button type="button" className="btn" autoFocus onClick={next}>{s.i + 1 < n ? 'Next Flashcard' : 'Finish quiz'}</button></div>
      </section>
    </>
  )
}
