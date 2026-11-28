import { useContext, useEffect, useRef } from 'react'
import { Ctx } from '../context/ReviewerContext.js'
import { Shell, Fld, Swatches } from './ui.jsx'
import { colors, findDeck } from '../utils/helpers.js'
import { CardForm } from '../../features/flashcards/CardForm.jsx'
import { SessionPicker } from '../../features/study-session/SessionPicker.jsx'

export function Modal({ m, close }) {
  const { tree, mut } = useContext(Ctx)
  const r = useRef()
  useEffect(() => {
    const el = r.current
    if (m && !el.open) el.showModal()
    if (!m && el.open) el.close()
  }, [m])
  let body = null
  if (m?.t === 'session') {
    body = <SessionPicker m={m} close={close} />
  } else if (m?.t === 'del') {
    body = <Shell icon="trash" title={m.title} sub={m.msg} ok="Delete" okCls="red" cancel="Keep it" close={close} onSubmit={async () => { if (await m.fn()) { close(); if (m.title.includes('class')) location.hash = '#/' } }} />
  } else if (m?.t === 'cls') {
    // Classes are only edited here. New classes are not created from the Reviewer.
    const c = tree.find((x) => x.id === m.id)
    body = c && (
      <Shell icon="edit" title="Edit Class" sub="Update the details below" close={close}
        onSubmit={async (f) => {
          if (await mut({ action: 'update_class', id: c.id, name: f.get('nm'), description: f.get('ds') || '', code: f.get('cd') || '', color: f.get('color') || colors[0] })) close()
        }}>
        <Fld id="nm" label="Class Name" def={c?.name} ph="e.g. Computer Science" />
        <div className="fld"><label htmlFor="cd">Class Code <span>(Optional)</span></label><input id="cd" name="cd" defaultValue={c?.code || ''} placeholder="e.g. CSP212" /></div>
        <div className="fld"><label htmlFor="ds">Description <span>(Optional)</span></label><textarea id="ds" name="ds" defaultValue={c?.description || ''} placeholder="What will you study in this class?" /></div>
        <Swatches sel={c?.color || colors[0]} />
      </Shell>
    )
  } else if (m?.t === 'deck') {
    const { d: dd } = m.id ? findDeck(tree, m.id) : {}
    body = (
      <Shell icon={dd ? 'edit' : 'deck'} title={dd ? 'Edit Deck' : 'Create Deck'} sub={dd ? 'Update the details below' : 'Give your deck a name'} close={close}
        onSubmit={async (f) => {
          const body = { action: dd ? 'update_deck' : 'create_deck', name: f.get('nm'), description: f.get('ds') || '', color: f.get('color') || colors[0], class_id: Number(f.get('cid')) }
          if (dd) body.id = dd.id
          if (await mut(body)) close()
        }}>
        <div className="fld"><label htmlFor="cid">Class</label>
          <select id="cid" name="cid" defaultValue={m.cid} required>{tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <Fld id="nm" label="Deck Name" def={dd?.name} ph="e.g. Linked Lists" />
        <div className="fld"><label htmlFor="ds">Description <span>(Optional)</span></label><textarea id="ds" name="ds" defaultValue={dd?.description || ''} placeholder="Describe what this deck covers." /></div>
        <Swatches sel={dd?.color || colors[0]} />
      </Shell>
    )
  } else if (m?.t === 'card') body = <CardForm key={`${m.did}-${m.id}`} m={m} close={close} />
  return <dialog ref={r} className={m?.w || ''} onClose={close}>{body}</dialog>
}
