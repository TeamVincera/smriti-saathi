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

export function navigate(path: string, keepQuery = false) {
  let targetPath = path
  if (keepQuery) {
    const currentHash = window.location.hash.replace(/^#/, '')
    const [, q] = currentHash.split('?')
    if (q) {
      targetPath = path.includes('?') ? `${path}&${q}` : `${path}?${q}`
    }
  }

  if (window.location.hash === `#${targetPath}`) return
  window.location.hash = targetPath
  window.scrollTo(0, 0)
}
