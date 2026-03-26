const CACHE_NAME = 'donde-esta-renata-v2'
const SHELL_ASSETS = ['/login']

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Don't intercept cross-origin requests (e.g. direct PUT to R2 presigned URLs)
  if (url.origin !== self.location.origin) return

  if (SHELL_ASSETS.includes(url.pathname)) {
    // Cache-first for shell assets
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  }
})
