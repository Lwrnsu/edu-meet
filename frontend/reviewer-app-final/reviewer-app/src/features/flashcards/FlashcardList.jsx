import { useContext } from 'react'
import { Ctx } from '../../shared/context/ReviewerContext.js'
import { I } from '../../shared/components/icons.jsx'
import { Answer } from './Answer.jsx'

// The flashcards of one deck, filtered by the search box, with edit and delete buttons.
export function FlashcardList({ d }) {
  const { q, setModal, mut } = useContext(Ctx)
  const list = d.cards.filter((k) => (k.question + k.answer).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      {list.map((k) => (
        <article className="fc" key={k.id}>
          <div className="q"><span>{k.question}</span>
            <button type="button" className="ib" aria-label="Edit flashcard" onClick={() => setModal({ t: 'card', w: 'lg', did: d.id, id: k.id })}><I n="edit" /></button>
            <button type="button" className="ib" aria-label="Delete flashcard" onClick={() => setModal({ t: 'del', w: 'sm', title: 'Delete this flashcard?', msg: 'This flashcard will be removed from the deck.', fn: () => mut({ action: 'delete_card', id: k.id }) })}><I n="trash" /></button>
          </div>
          <div className="a"><Answer k={k} /></div>
        </article>
      ))}
    </>
  )
}
