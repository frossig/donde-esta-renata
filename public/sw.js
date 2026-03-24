const CACHE_NAME = 'donde-esta-renata-v1'
const SHELL_ASSETS = ['/', '/login']

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
  if (SHELL_ASSETS.includes(new URL(event.request.url).pathname)) {
    // Cache-first for shell assets
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  } else {
    // Network-first for everything else
    event.respondWith(fetch(event.request))
  }
})
