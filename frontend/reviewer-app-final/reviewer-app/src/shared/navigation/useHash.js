import { useEffect, useState } from 'react'

// Current URL hash, split into the view name and the id, e.g. #/deck/3 -> ['deck', 3].
export const useHash = () => {
  const [h, setH] = useState(location.hash)
  useEffect(() => {
    const f = () => { setH(location.hash); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  const [, v, id] = h.split('/')
  return [v, Number(id)]
}
