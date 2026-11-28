import { useContext } from 'react'
import { Ctx } from '../../shared/context/ReviewerContext.js'
import { I } from '../../shared/components/icons.jsx'
import { Tile } from '../../shared/components/ui.jsx'
import { plural, classColor } from '../../shared/utils/helpers.js'

export function Home() {
  const { tree, q, setModal, mut } = useContext(Ctx)
  const nd = tree.reduce((a, c) => a + c.total_decks, 0)
  const fc = tree.reduce((a, c) => a + c.total_flashcards, 0)
  const stats = [['Total Classes', tree.length, '#E4DCFB', '#9B7FE0', 'cls'], ['Total Decks', nd, '#C3D0FA', '#6E86E8', 'deck'], ['Total Flashcards', fc, '#CDF9E2', '#4CC38A', 'fcard']]
  const list = tree.filter((c) => (c.name + ' ' + (c.code || '')).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <p className="eyebrow">Your learning space</p>
      <p className="tag">Make Every Review Count.</p>
      <p className="sub">Organize, review, and learn every day.</p>
      <div className="stats">
        {stats.map((s) => (
          <div key={s[0]} className="stat" style={{ background: s[2] }}><span>{s[0]}</span><b>{s[1]}</b><i style={{ background: s[3] }}><I n={s[4]} /></i></div>
        ))}
      </div>
      <div className="sec"><span className="bi"><I n="cls" /></span><div><h2>Classes</h2><p>Pick a class to see its decks</p></div>
</div>
      <div className="grid">
        {list.map((c) => (
          <Tile key={c.id} kind="cls" o={{ t: c.name, c: classColor(c), code: c.code, n: plural(c.total_decks, 'deck'), h: `#/class/${c.id}` }}
            onEdit={() => setModal({ t: 'cls', id: c.id })}
            onDel={() => setModal({ t: 'del', w: 'sm', title: 'Delete this class?', msg: 'The class and all of its decks and flashcards will be removed.', fn: () => mut({ action: 'delete_class', id: c.id }) })} />
        ))}
      </div>
    </>
  )
}
