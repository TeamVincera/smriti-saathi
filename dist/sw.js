// This file is copied to dist/ and filled by scripts/inject-sw-precache.mjs.
// Keep the placeholders here so a production build fails loudly if injection
// is skipped rather than silently shipping a shell-only offline cache.
const CACHE_VERSION = '4ce2f3238d9b1919'
const CACHE = `smriti-sathi-offline-${CACHE_VERSION}`
const ASSETS = [
  "./alarm.wav",
  "./assets/ai-Cr8ihBE5.js",
  "./assets/CaregiverHub-DFKCv6Tp.js",
  "./assets/GameHost-CCtnsEMn.js",
  "./assets/Home-NSmPnS23.js",
  "./assets/image-BLgaGUM7.js",
  "./assets/index-BHo1xEOn.js",
  "./assets/index-CVuruUCk.css",
  "./assets/Meds-C-wF2x_9.js",
  "./assets/Onboarding-DphcvSMt.js",
  "./assets/react-CIE12tXq.js",
  "./assets/Reminders-n_E9GgUI.js",
  "./assets/web-B0vRAUKm.js",
  "./assets/web-BM8XFxBg.js",
  "./assets/web-CgT4stro.js",
  "./assets/web-t1tYZ2pg.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
  "./icons/maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
]
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
