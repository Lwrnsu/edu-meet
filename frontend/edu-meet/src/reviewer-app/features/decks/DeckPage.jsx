import { useContext } from 'react'
import { Ctx } from '../../shared/context/ReviewerContext.js'
import { I } from '../../shared/components/icons.jsx'
import { Head, Pill } from '../../shared/components/ui.jsx'
import { findDeck } from '../../shared/utils/helpers.js'
import { Home } from '../class/ClassesPage.jsx'
import { FlashcardList } from '../flashcards/FlashcardList.jsx'

// One deck: its flashcards, with buttons to start a session or add a card.
export function DeckPage({ id }) {
  const { tree, setModal } = useContext(Ctx)
  const { c, d } = findDeck(tree, id)
  if (!d) return <Home />
  return (
    <>
      <Head back={<Pill h={`#/class/${c.id}`} t="Back to Decks" />} icon="deck" title={d.name}>
        <button type="button" className="btn st" onClick={() => setModal({ t: 'session', w: 'md', id: d.id })}><I n="start" />Start session</button>
        <button type="button" className="btn dk" onClick={() => setModal({ t: 'card', w: 'lg', did: d.id })}><I n="add" />Create flashcard</button>
      </Head>
      <p className="cc">Card Count: {d.cards.length}</p>
      <FlashcardList d={d} />
    </>
  )
}
