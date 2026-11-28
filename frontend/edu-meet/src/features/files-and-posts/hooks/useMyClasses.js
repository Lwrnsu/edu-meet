// The logged-in user's classes and name (from the Classes module tables),
// shared by the sidebar, the Classes page and the class banner.
import { useEffect, useState } from 'react'
import { classesApi } from '../api/phpApi'

let cache = null        // last successful result
let pending = null      // request in flight

export function loadMyClasses(force = false) {
  if (!force && cache) return Promise.resolve(cache)
  if (!pending) {
    pending = classesApi.mine().then((r) => {
      pending = null
      if (r.response) cache = r
      return r
    })
  }
  return pending
}

// [result | null]; result = ApiResponse with body { classes, me }
export function useMyClasses() {
  const [result, setResult] = useState(cache)
  useEffect(() => {
    let live = true
    loadMyClasses().then((r) => { if (live) setResult(r) })
    return () => { live = false }
  }, [])
  return result
}
