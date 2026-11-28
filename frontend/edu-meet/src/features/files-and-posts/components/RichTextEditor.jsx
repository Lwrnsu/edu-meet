/*
  Small rich-text editor for announcements:
  Normal / headings · text size · colour · bold · italic · underline ·
  strikethrough · bullet list · numbered list · link.

  Uncontrolled: `initial` is loaded once; every change calls onChange(html).
  The server cleans the HTML again before saving (php/helpers/RichText.php).
*/
import { useEffect, useRef, useState } from 'react'

const BLOCKS = [['p', 'Normal'], ['h2', 'Heading 1'], ['h3', 'Heading 2'], ['h4', 'Heading 3']]
const SIZES = ['12', '14', '16', '18', '20', '24']

// Plain text (older announcements) → HTML with line breaks.
export function toEditorHtml(text) {
  if (!text) return ''
  if (/<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/i.test(text)) return text
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}

export function isEmptyHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent.trim() === ''
}

function Tool({ label, title, onClick, active, children }) {
  return (
    <button
      type="button"
      className={`fb-rte__btn${active ? ' is-on' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}   // keep the text selection
      onClick={onClick}
    >
      {children || label}
    </button>
  )
}

export default function RichTextEditor({ id, initial = '', onChange, placeholder, invalid }) {
  const ref = useRef(null)
  const [state, setState] = useState({})

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = toEditorHtml(initial)
    // load once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit() {
    onChange(ref.current.innerHTML)
    refresh()
  }

  function refresh() {
    try {
      setState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      })
    } catch {
      // queryCommandState can throw when nothing is focused
    }
  }

  function run(command, value = null) {
    ref.current.focus()
    document.execCommand('styleWithCSS', false, command === 'foreColor')
    document.execCommand(command, false, value)
    emit()
  }

  // execCommand only knows sizes 1–7; mark with 7, then swap for a pixel size.
  function setSize(px) {
    ref.current.focus()
    document.execCommand('styleWithCSS', false, false)
    document.execCommand('fontSize', false, '7')
    ref.current.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement('span')
      span.style.fontSize = `${px}px`
      span.innerHTML = font.innerHTML
      font.replaceWith(span)
    })
    emit()
  }

  function addLink() {
    const url = window.prompt('Link address (https://…)', 'https://')
    if (!url) return
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) {
      window.alert('Links must start with https://, http:// or mailto:')
      return
    }
    run('createLink', url.trim())
  }

  return (
    <div className={`fb-rte${invalid ? ' fb-rte--invalid' : ''}`}>
      <div className="fb-rte__bar" role="toolbar" aria-label="Formatting">
        <select aria-label="Paragraph style" defaultValue="p" onChange={(e) => { run('formatBlock', `<${e.target.value}>`); e.target.value = 'p' }}>
          {BLOCKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Text size" defaultValue="14" onChange={(e) => setSize(e.target.value)}>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="fb-rte__btn fb-rte__color" title="Text colour">
          <span aria-hidden="true">A</span>
          <input type="color" aria-label="Text colour" defaultValue="#2563eb" onChange={(e) => run('foreColor', e.target.value)} />
        </label>
        <span className="fb-rte__sep" />
        <Tool title="Bold" active={state.bold} onClick={() => run('bold')}><b>B</b></Tool>
        <Tool title="Italic" active={state.italic} onClick={() => run('italic')}><i>I</i></Tool>
        <Tool title="Underline" active={state.underline} onClick={() => run('underline')}><u>U</u></Tool>
        <Tool title="Strikethrough" active={state.strike} onClick={() => run('strikeThrough')}><s>S</s></Tool>
        <span className="fb-rte__sep" />
        <Tool title="Bulleted list" active={state.ul} onClick={() => run('insertUnorderedList')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>
        </Tool>
        <Tool title="Numbered list" active={state.ol} onClick={() => run('insertOrderedList')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 6h10M10 12h10M10 18h10M4 4v4M3 18h3l-3 3h3" /></svg>
        </Tool>
        <Tool title="Link" onClick={addLink}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1" /></svg>
        </Tool>
      </div>
      <div
        id={id}
        ref={ref}
        className="fb-rte__area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-invalid={invalid || undefined}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={emit}
        onKeyUp={refresh}
        onMouseUp={refresh}
        onPaste={(e) => {
          // paste as plain text so outside styles don't come along
          e.preventDefault()
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
        }}
      />
    </div>
  )
}
