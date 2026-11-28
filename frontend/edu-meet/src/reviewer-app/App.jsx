import { useEffect, useState } from 'react'
import Header from './shared/navigation/Header.jsx'
import { api } from './shared/api/api.js'
import { Ctx } from './shared/context/ReviewerContext.js'
import { P } from './shared/components/icons.jsx'
import { useHash } from './shared/navigation/useHash.js'
import { findDeck } from './shared/utils/helpers.js'
import { Modal } from './shared/components/Modal.jsx'
import { Home } from './features/class/ClassesPage.jsx'
import { ClassPage } from './features/class/ClassPage.jsx'
import { DeckPage } from './features/decks/DeckPage.jsx'
import { QuizSession } from './features/quiz-mode/QuizSession.jsx'
import { FlashcardSession } from './features/study-session/FlashcardSession.jsx'

/* ---------- app ---------- */
export default function App() {
  const [tree, setTree] = useState(null)
  const [notice, setNotice] = useState('')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [v, id] = useHash()
  useEffect(() => setQ(''), [v, id])
  useEffect(() => {
    api.tree().then(setTree).catch((e) => { setNotice(e.message); setTree([]) })
  }, [])
  // Saves through the API and throws the server's message on failure (used by the import flow).
  const send = async (body) => {
    setTree(await api.reviewer(body))
    setNotice('')
  }
  // Saves through the API. Returns true when saved, so forms can close.
  const mut = async (body) => {
    try {
      await send(body)
      return true
    } catch (e) {
      setNotice(e.message)
      return false
    }
  }
  let page = <p className="empty">{tree ? '' : 'Loading…'}</p>
  if (tree) {
    page = <Home />
    if (v === 'class') page = <ClassPage id={id} />
    else if (v === 'deck') page = <DeckPage id={id} />
    else if (v === 'quiz' || v === 'flash') {
      const d = findDeck(tree, id).d
      if (!d) page = <Home />
      else if (v === 'quiz') page = <QuizSession key={`quiz${id}`} d={d} />
      else page = <FlashcardSession key={`flash${id}`} d={d} />
    }
  }
  return (
    <Ctx.Provider value={{ tree: tree || [], q, setModal, mut, send }}>
      <div className="rv">
      <Header current="reviewer" inputId="q" label="Search class, deck, or flashcard" placeholder="Search class, deck, or flashcard..." q={q} setQ={setQ}
        icon={<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="#6C4FD8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 9h6M8 9v24a2 2 0 002 2h14a2 2 0 002-2V22M13 20h8M13 26h12M13 14h4" /><path d="M29 4l1.8 5.2L36 11l-5.2 1.8L29 18l-1.8-5.2L22 11l5.2-1.8z" fill="#B9A6F5" /></svg>} />
      <div className="frame"><main tabIndex={-1}>
        {notice && <p className="notice" role="alert">{notice}</p>}
        {page}
      </main></div>
      <button type="button" className="ai" aria-label="AI assistant"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#3B2E8A" strokeWidth="1.8" strokeLinejoin="round">{P.sparkle}</svg></button>
      <Modal m={modal} close={() => setModal(null)} />
      </div>
    </Ctx.Provider>
  )
}
