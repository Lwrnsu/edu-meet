/*
  Target Audience for a class post: Department → Program → Section.
  `tree` comes from api/resources.php?action=blocks (body.tree).
  Ticking a department or program ticks every section under it.
  Nothing ticked = all sections.
*/
import { useEffect, useRef } from 'react'

function GroupBox({ ids, selected, onToggle, children, className }) {
  const ref = useRef(null)
  const on = ids.filter((id) => selected.includes(id)).length
  const all = ids.length > 0 && on === ids.length
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = on > 0 && !all
  }, [on, all])
  return (
    <label className={className}>
      <input ref={ref} type="checkbox" checked={all} onChange={() => onToggle(ids, !all)} />
      {children}
    </label>
  )
}

function audienceSummary(tree, selected) {
  const parts = []
  tree.forEach((d) => d.programs.forEach((p) => {
    const on = p.sections.filter((s) => selected.includes(s.id)).map((s) => s.section)
    if (on.length) parts.push(`${p.code} ${on.join(', ')}`)
  }))
  return parts.length ? parts.join(' · ') : 'All sections'
}

export default function AudiencePicker({ tree, selected, onChange }) {
  if (!tree.length) {
    return <span className="fb-hint">No sections in this class yet, so it will be visible to everyone.</span>
  }

  function toggle(ids, on) {
    const rest = selected.filter((id) => !ids.includes(id))
    onChange(on ? rest.concat(ids) : rest)
  }

  return (
    <>
      <div className="fb-aud">
        {tree.map((d) => {
          const deptIds = d.programs.flatMap((p) => p.sections.map((s) => s.id))
          return (
            <div className="fb-aud__dept" key={d.id}>
              <GroupBox className="fb-aud__head" ids={deptIds} selected={selected} onToggle={toggle}>
                <span><b>{d.code}</b> {d.name}</span>
              </GroupBox>
              {d.programs.map((p) => (
                <div className="fb-aud__prog" key={p.id}>
                  <GroupBox
                    className="fb-aud__pname"
                    ids={p.sections.map((s) => s.id)}
                    selected={selected}
                    onToggle={toggle}
                  >
                    <span title={p.name}>{p.code}</span>
                  </GroupBox>
                  <div className="fb-checks">
                    {p.sections.map((s) => (
                      <label key={s.id}>
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={(e) => toggle([s.id], e.target.checked)}
                        />
                        <span>{s.section}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="fb-aud__summary">Visible to: <b>{audienceSummary(tree, selected)}</b></div>
    </>
  )
}
