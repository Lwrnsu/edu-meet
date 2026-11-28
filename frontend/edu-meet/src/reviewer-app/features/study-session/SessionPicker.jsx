import { I } from '../../shared/components/icons.jsx'

// Popup from "Start session": choose Quiz Mode or Flashcard Mode.
export function SessionPicker({ m, close }) {
  return (
    <>
      <h2><I n="start" />Choose Session Type</h2><p className="ds">Choose your preferred study mode to begin.</p>
      <button type="button" className="mode" style={{ background: '#DACCEB' }} onClick={() => { location.hash = `#/quiz/${m.id}`; close() }}><I n="quiz" /><span>Quiz Mode<small>Active identification quiz.</small></span></button>
      <button type="button" className="mode" style={{ background: '#C5C2F4', borderColor: '#4B3FA0' }} onClick={() => { location.hash = `#/flash/${m.id}`; close() }}><I n="fcard" /><span>Flashcard Mode<small>Review with simple flip cards.</small></span></button>
      <div className="row"><button type="button" className="btn lt" onClick={close}>Cancel</button></div>
    </>
  )
}
