import { useContext, useRef, useState } from 'react'
import { Ctx } from '../../shared/context/ReviewerContext.js'
import { I } from '../../shared/components/icons.jsx'
import { Shell, Swatches } from '../../shared/components/ui.jsx'
import { colors, plural, findDeck } from '../../shared/utils/helpers.js'
import { parseFlashcardJson, MAX_FILE_BYTES } from './import/flashcardJson.js'

// Flashcard modal. Editing uses the full form. Creating has three screens:
// manual entry, JSON import, and the confirmation before the imported cards are saved.
export function CardForm({ m, close }) {
  const { tree } = useContext(Ctx)
  const d = findDeck(tree, m.did).d
  const k = m.id ? d.cards.find((x) => x.id === m.id) : null
  return k ? <EditCardForm k={k} close={close} /> : <CreateCardFlow d={d} close={close} />
}

// Shows the key-answer buttons. Used by both the create and edit forms.
export function KeyControls({ textRef, keyAnswer, setKey }) {
  return (
    <div className="hl">
      <p>{keyAnswer ? `Key answer: ${keyAnswer}` : 'Select part of the answer, then mark it as the key answer.'}</p>
      <button type="button" className="chip on" onMouseDown={(e) => e.preventDefault()} onClick={() => { const el = textRef.current; const t = el.value.slice(el.selectionStart, el.selectionEnd).trim(); if (t) setKey(t) }}>Highlight key answer</button>
      <button type="button" className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => setKey('')}>Clear highlight</button>
    </div>
  )
}

export function EditCardForm({ k, close }) {
  const { mut } = useContext(Ctx)
  const [key, setKey] = useState(k.key_answer || '')
  const fa = useRef()
  const save = async (f) => {
    const body = {
      action: 'update_card', id: k.id,
      question: f.get('q'),
      answer: f.get('a'),
      explanation: f.get('ex') || '',
      difficulty: f.get('dif') || 'medium',
      key_answer: key,
      color: f.get('color') || colors[0],
    }
    if (await mut(body)) close()
  }
  return (
    <Shell icon="edit" title="Edit Flashcard" sub="Update the details below" onSubmit={save} close={close}>
      <div className="fld"><label htmlFor="fq">Question</label><textarea id="fq" name="q" required defaultValue={k.question} placeholder="Edit a question here..." /></div>
      <div className="fld"><label htmlFor="fa">Answer</label>
        <textarea id="fa" name="a" required ref={fa} defaultValue={k.answer} placeholder="Edit an answer here.."
          onInput={(e) => { if (key && !e.target.value.includes(key)) setKey('') }} />
        <KeyControls textRef={fa} keyAnswer={key} setKey={setKey} />
      </div>
      <div className="fld"><label htmlFor="fex">Explanation <span>(Optional)</span></label><textarea id="fex" name="ex" defaultValue={k.explanation || ''} placeholder="Shown after a wrong or right quiz answer." /></div>
      <div className="fld"><label htmlFor="fdif">Difficulty</label>
        <select id="fdif" name="dif" defaultValue={k.difficulty || 'medium'}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
      </div>
      <Swatches sel={k.color || colors[0]} legend="Highlight color:" />
    </Shell>
  )
}

export function CreateCardFlow({ d, close }) {
  const { send } = useContext(Ctx)
  const [step, setStep] = useState('manual') // manual | upload | ready
  const [key, setKey] = useState('')
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [imp, setImp] = useState(null)     // { cards, name } after a valid file is read
  const [saved, setSaved] = useState(0)    // imported cards already saved (so Save can resume)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const fa = useRef()
  const fileInput = useRef()
  const importing = step !== 'manual'

  // Manual card: question, answer, key answer, and color.
  const saveManual = async (f) => {
    const question = (f.get('q') || '').trim()
    const answer = (f.get('a') || '').trim()
    if (!question || !answer) return setErrors(['Question and answer are required.'])
    setBusy(true)
    try {
      await send({ action: 'create_card', deck_id: d.id, question, answer, explanation: '', difficulty: 'medium', key_answer: key, color: f.get('color') || colors[0] })
      close()
    } catch (e) {
      setErrors([e.message])
    } finally {
      setBusy(false)
    }
  }

  const chooseFile = (f) => {
    setErrors([])
    if (!f) return
    if (!/\.json$/i.test(f.name) && f.type !== 'application/json') return setErrors(['Please choose a .json file.'])
    if (f.size > MAX_FILE_BYTES) return setErrors(['That file is too large. The limit is 1 MB.'])
    setFile(f)
  }

  // Parses and validates the chosen file. Shows every problem found, or moves to the confirmation screen.
  const readFile = async () => {
    if (!file) return setErrors(['Choose a .json file first.'])
    setBusy(true)
    try {
      const res = parseFlashcardJson(await file.text())
      if (!res.ok) return setErrors(res.errors)
      setImp({ cards: res.cards, name: file.name })
      setSaved(0)
      setErrors([])
      setStep('ready')
    } catch {
      setErrors(['Could not read this file.'])
    } finally {
      setBusy(false)
    }
  }

  // Saves the imported cards to this deck one at a time. If one fails, Save resumes from there.
  const saveImported = async () => {
    setBusy(true)
    setErrors([])
    let n = saved
    try {
      for (; n < imp.cards.length; n++) {
        const c = imp.cards[n]
        await send({ action: 'create_card', deck_id: d.id, question: c.question, answer: c.answer, explanation: c.explanation || '', difficulty: c.difficulty, key_answer: '', color: colors[0] })
        setSaved(n + 1)
      }
      close()
    } catch (e) {
      setErrors([`Saved ${n} of ${imp.cards.length} flashcards. ${e.message} Press Save to try the rest again.`])
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (busy) return
    if (step === 'manual') saveManual(new FormData(e.currentTarget))
    else if (step === 'upload') readFile()
    else saveImported()
  }

  const shownErrors = errors.slice(0, 8)
  return (
    <form className="cf" onSubmit={onSubmit} noValidate>
      <h2><I n={importing ? 'upload' : 'fcard'} />{importing ? 'Import JSON File' : 'Create a Flashcard'}</h2>
      <p className="ds">{importing ? 'Upload a JSON File to create flashcards automatically.' : 'Fill in the details below to add a new card.'}</p>

      {step === 'manual' && (
        <>
          <div className="fld"><label htmlFor="fq">Question</label><textarea id="fq" name="q" placeholder="Type or paste a question..." /></div>
          <div className="fld"><label htmlFor="fa">Answer</label>
            <textarea id="fa" name="a" ref={fa} placeholder="Type or paste an answer..."
              onInput={(e) => { if (key && !e.target.value.includes(key)) setKey('') }} />
            <KeyControls textRef={fa} keyAnswer={key} setKey={setKey} />
          </div>
          <Swatches legend="Color:" />
        </>
      )}

      {step === 'upload' && (
        <>
          <div className={`dz ${drag ? 'over' : ''}`} role="button" tabIndex={0}
            onClick={() => fileInput.current.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current.click() } }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files[0]) }}>
            <I n="upload" />
            <b>{file ? file.name : 'Drag or click to upload file here'}</b>
            <small>Import JSON file to create flashcards</small>
          </div>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => chooseFile(e.target.files[0])} />
        </>
      )}

      {step === 'ready' && (
        <div className="ready">
          <span className="ok-ring"><I n="checkCircle" /></span>
          <h3>Flashcards Generated!</h3>
          <p>Save your flashcards to use them</p>
          <p className="sum">{imp.cards.length} valid {plural(imp.cards.length, 'flashcard')} ready to save from {imp.name}</p>
        </div>
      )}

      {shownErrors.length > 0 && (
        <div className="imp-err" role="alert">
          <b>{step === 'upload' ? "This file can't be imported" : "Couldn't save"}</b>
          <ul>
            {shownErrors.map((x, i) => <li key={i}>{x}</li>)}
            {errors.length > shownErrors.length && <li>…and {errors.length - shownErrors.length} more</li>}
          </ul>
        </div>
      )}

      <div className="row split">
        {step === 'manual'
          ? <button type="button" className="btn dk imp" onClick={() => { setErrors([]); setStep('upload') }}><I n="upload" />Import JSON File</button>
          : <span />}
        <div className="rr">
          <button type="button" className="btn lt" onClick={close}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>{step === 'upload' ? 'Create Flashcards' : 'Save'}</button>
        </div>
      </div>
    </form>
  )
}
