import { Chip } from '../../shared/components/ui.jsx'
import { ALL, PINNED, catStyle } from '../../shared/utils/helpers.js'

// Row of filter chips above the notes: All, Pinned, and one per category.
export function FilterChips({ cats, filter, setFilter }) {
  return (
    <div className="chips" role="group" aria-label="Filter notes">
      <Chip c={ALL} label="All" on={filter === 'all'} onClick={() => setFilter('all')} />
      <Chip c={PINNED} label="Pinned" on={filter === 'pinned'} onClick={() => setFilter('pinned')} />
      {cats.map((name) => <Chip key={name} c={{ ...catStyle(name), name }} on={filter === `c:${name}`} onClick={() => setFilter(`c:${name}`)} />)}
    </div>
  )
}
