import { useContext } from 'react'
import { Ctx } from '../../shared/context/ReviewerContext.js'
import { I } from '../../shared/components/icons.jsx'
import { Head, Pill, Tile } from '../../shared/components/ui.jsx'
import { plural, deckColor } from '../../shared/utils/helpers.js'
import { Home } from './ClassesPage.jsx'

export function ClassPage({ id }) {
  const { tree, q, setModal, mut } = useContext(Ctx)
  const c = tree.find((x) => x.id === id)
  if (!c) return <Home />
  const list = c.decks.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <Head back={<Pill h="#/" t="Back to Classes" />} icon="cls" title={c.name} sub="Pick a deck to see its flashcards">
        <button type="button" className="btn dk" onClick={() => setModal({ t: 'deck', cid: c.id })}><I n="add" />Create deck</button>
      </Head>
      <div className="grid">
        {list.map((d) => (
          <Tile key={d.id} kind="deck" o={{ t: d.name, c: deckColor(d), n: plural(d.total_flashcards, 'card'), h: `#/deck/${d.id}` }}
            onEdit={() => setModal({ t: 'deck', cid: c.id, id: d.id })}
            onDel={() => setModal({ t: 'del', w: 'sm', title: 'Delete this deck?', msg: 'The deck and all of its flashcards will be removed.', fn: () => mut({ action: 'delete_deck', id: d.id }) })} />
        ))}
        {!list.length && <p className="empty">No decks yet. Create a deck to start adding flashcards.</p>}
      </div>
    </>
  )
}
