/*
  Drop zone + list of chosen files (F3 upload, B3 attachments, announcement file).
  Controlled: files / onChange(files). Problems are shown per file before upload.
*/
import { useRef, useState } from 'react'
import Icon from './Icon'
import { ACCEPT, extensionOf, fileProblem, fmtSize, typeClass } from '../utils/format'

export default function FilePicker({ files, onChange, max, hint, multiple = true }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)

  function add(list) {
    const next = multiple ? files.concat(Array.from(list)) : Array.from(list).slice(0, 1)
    onChange(next.slice(0, max))
  }

  return (
    <>
      <div
        className={`fb-drop${over ? ' fb-drop--over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
      >
        <Icon name="upload" size={30} />
        <div>Drag {multiple ? 'files' : 'a file'} here or <b>browse</b></div>
        <div className="fb-hint">{hint}</div>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={ACCEPT}
        onChange={(e) => { add(e.target.files); e.target.value = '' }}
      />
      {files.length ? (
        <div className="fb-stack">
          {files.map((f, i) => {
            const ext = extensionOf(f.name)
            const problem = fileProblem(f)
            return (
              <div className="fb-file-row" key={`${f.name}-${i}`}>
                <div className={`fb-badge ${typeClass(ext)}`}>{ext.toUpperCase() || '?'}</div>
                <div className="fb-grow">
                  {f.name}
                  <small className={problem ? 'fb-text-bad' : ''}>{fmtSize(f.size)} · {problem || 'Ready'}</small>
                </div>
                <button
                  type="button"
                  className="fb-x"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
