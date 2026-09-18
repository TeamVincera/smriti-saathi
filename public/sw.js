// This file is copied to dist/ and filled by scripts/inject-sw-precache.mjs.
// Keep the placeholders here so a production build fails loudly if injection
// is skipped rather than silently shipping a shell-only offline cache.
const CACHE_VERSION = '__SMRITI_CACHE_VERSION__'
const CACHE = `smriti-sathi-offline-${CACHE_VERSION}`
const ASSETS = __SMRITI_PRECACHE_ASSETS__
const INDEX_URL = new URL('./index.html', self.registration.scope).toString()

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('smriti-sathi-offline-') && k !== CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  // Never cache AI health or proxy responses. Status is intentionally a
  // live readiness signal, and cached responses could leave cloud controls
  // stale after an outage or recovery.
  if (url.pathname.startsWith('/api/ai/')) return

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Do not replace the known-good shell with a transient 4xx/5xx
          // response; otherwise the next offline launch can be poisoned.
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(INDEX_URL, copy))
          }
          return res
        })
        .catch(() => caches.match(INDEX_URL).then((r) => r || caches.match(new URL('./', self.registration.scope).toString())))
    )
    return
  }

  event.respondWith(
    caches.match(url.href, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          if ((res.ok || res.type === 'opaque') && !/\bno-store\b/i.test(res.headers.get('cache-control') || '')) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
    }).catch(() => Response.error())
  )
})
