// Short message at the bottom of the screen after an action.
import { useCallback, useEffect, useRef, useState } from 'react'

// const [toast, showToast] = useToast();  …  {toast}
export function useToast() {
  const [state, setState] = useState(null)
  const timer = useRef(null)
  const show = useCallback((message, ok = true) => {
    setState({ message, ok })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState(null), 3500)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  const element = state ? (
    <div className={`fb-toast${state.ok ? '' : ' fb-toast--bad'}`} role="status">{state.message}</div>
  ) : null
  return [element, show]
}
