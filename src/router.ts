import { useEffect, useState, useCallback } from 'react'

export function useHashRoute(): { path: string; query: URLSearchParams } {
  const read = () => {
    const h = window.location.hash.replace(/^#/, '') || '/'
    const [p, q] = h.split('?')
    return { path: p || '/', query: new URLSearchParams(q ?? '') }
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(path: string) {
  if (window.location.hash === `#${path}`) return
  window.location.hash = path
  window.scrollTo(0, 0)
}
